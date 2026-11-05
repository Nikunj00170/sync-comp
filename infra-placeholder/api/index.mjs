const healthResponse = () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify({
    status: "ok",
    service: "sync-prototype-api",
    mode: "infrastructure-test",
  }),
});

const errorText = (error) => `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;

async function storageCheck() {
  const [{ randomUUID }, ddb, s3] = await Promise.all([
    import("node:crypto"),
    import("@aws-sdk/client-dynamodb"),
    import("@aws-sdk/client-s3"),
  ]);
  const dynamo = new ddb.DynamoDBClient({ maxAttempts: 2 });
  const objects = new s3.S3Client({ maxAttempts: 2 });
  const testId = randomUUID();
  const send = (client, command) => client.send(command, { abortSignal: AbortSignal.timeout(4000) });

  async function checkTable(label, variable) {
    const result = { resource: label, status: "passed" };
    const table = process.env[variable];
    if (!table) return { resource: label, status: "failed", error: `Missing ${variable}` };
    const key = { PK: { S: `INFRA_CHECK#${testId}` }, SK: { S: "CHECK" } };
    let attempted = false;
    try {
      attempted = true;
      await send(dynamo, new ddb.PutItemCommand({
        TableName: table,
        Item: { ...key, infrastructureTestId: { S: testId } },
        ConditionExpression: "attribute_not_exists(PK)",
      }));
      const response = await send(dynamo, new ddb.GetItemCommand({
        TableName: table, Key: key, ConsistentRead: true,
      }));
      if (response.Item?.infrastructureTestId?.S !== testId) throw new Error("Read-back did not match");
    } catch (error) {
      result.status = "failed";
      result.error = errorText(error);
    } finally {
      if (attempted) {
        try {
          await send(dynamo, new ddb.DeleteItemCommand({
            TableName: table,
            Key: key,
            ConditionExpression: "attribute_not_exists(PK) OR infrastructureTestId = :testId",
            ExpressionAttributeValues: { ":testId": { S: testId } },
          }));
        } catch (error) {
          result.status = "failed";
          result.cleanupError = errorText(error);
          result.testKey = { PK: key.PK.S, SK: key.SK.S };
        }
      }
    }
    return result;
  }

  async function checkDocuments() {
    const result = { resource: "documents", status: "passed" };
    const bucket = process.env.DOCUMENTS_BUCKET;
    if (!bucket) return { resource: "documents", status: "failed", error: "Missing DOCUMENTS_BUCKET" };
    const key = `_infra-check/${testId}.txt`;
    let attempted = false;
    try {
      const body = `Infrastructure check: ${testId}`;
      attempted = true;
      await send(objects, new s3.PutObjectCommand({
        Bucket: bucket, Key: key, Body: body, ContentType: "text/plain",
      }));
      const response = await send(objects, new s3.GetObjectCommand({ Bucket: bucket, Key: key }));
      if (await response.Body.transformToString() !== body) throw new Error("Read-back did not match");
    } catch (error) {
      result.status = "failed";
      result.error = errorText(error);
    } finally {
      if (attempted) {
        try {
          await send(objects, new s3.DeleteObjectCommand({ Bucket: bucket, Key: key }));
        } catch (error) {
          result.status = "failed";
          result.cleanupError = errorText(error);
          result.testKey = key;
        }
      }
    }
    return result;
  }

  const checks = await Promise.all([
    checkTable("customers", "CUSTOMERS_TABLE"),
    checkTable("orders", "ORDERS_TABLE"),
    checkTable("activity", "ACTIVITY_TABLE"),
    checkDocuments(),
  ]);
  return { status: checks.every((check) => check.status === "passed") ? "passed" : "failed", checks };
}

export const handler = async (event = {}) => {
  // API Gateway supplies requestContext; only direct IAM invocations can run this diagnostic.
  if (event?.operation === "storage-check" && !event.requestContext && !event.httpMethod && !event.version) {
    return storageCheck();
  }
  return healthResponse();
};
