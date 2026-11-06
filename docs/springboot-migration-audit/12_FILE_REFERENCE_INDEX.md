# File reference index

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Snapshot and lookup

VERIFIED IN CODE: source paths below are repository-relative. Line anchors are 1-based; SHA-256 identifies the audited bytes. New audit documents are excluded from source snapshot. No private files, environment values or credential files are included. Use `nl -ba <path>` to inspect exact context.

## Exported domain symbols

| Path:line | Symbol |
| --- | --- |
| packages/domain/src/index.ts:4 | `export type Product` |
| packages/domain/src/index.ts:22 | `export const catalogue` |
| packages/domain/src/index.ts:23 | `export const CATALOGUE_VERSION` |
| packages/domain/src/index.ts:24 | `export const DEMO_TAX_BPS` |
| packages/domain/src/index.ts:25 | `export const profileSchema` |
| packages/domain/src/index.ts:40 | `export type Profile` |
| packages/domain/src/index.ts:41 | `export type CartLine` |
| packages/domain/src/index.ts:42 | `export type Quote` |
| packages/domain/src/index.ts:51 | `export type OrderStatus` |
| packages/domain/src/index.ts:53 | `export const orderSteps: OrderStatus[]` |
| packages/domain/src/index.ts:61 | `export const statusLabels: Record<OrderStatus, string>` |
| packages/domain/src/index.ts:70 | `export type TimelineEvent` |
| packages/domain/src/index.ts:71 | `export type Order` |
| packages/domain/src/index.ts:82 | `export type InvoiceLine` |
| packages/domain/src/index.ts:88 | `export type Invoice` |
| packages/domain/src/index.ts:101 | `export type DocumentMeta` |
| packages/domain/src/index.ts:108 | `export type Kyc` |
| packages/domain/src/index.ts:115 | `export type Ticket` |
| packages/domain/src/index.ts:123 | `export type Notification` |
| packages/domain/src/index.ts:131 | `export type Workspace` |
| packages/domain/src/index.ts:145 | `export function money(paise: number, decimals` |
| packages/domain/src/index.ts:153 | `export const productById` |
| packages/domain/src/index.ts:154 | `export function eligibility(p: Product, profile: Profile): string[]` |
| packages/domain/src/index.ts:164 | `export function defaultQuantity(p: Product, profile: Profile)` |
| packages/domain/src/index.ts:170 | `export function addToCart(lines: CartLine[], id: string, profile: Profile): CartLine[]` |
| packages/domain/src/index.ts:187 | `export function removeFromCart(lines: CartLine[], id: string): CartLine[]` |
| packages/domain/src/index.ts:202 | `export function quote(lines: CartLine[], profile: Profile): Quote` |
| packages/domain/src/index.ts:239 | `export function recommendations(profile: Profile)` |
| packages/domain/src/index.ts:286 | `export function nextOrder(order: Order): Order` |
| packages/domain/src/index.ts:303 | `export function cancelOrder(order: Order): Order` |
| packages/domain/src/index.ts:319 | `export const makeId` |
| packages/domain/src/index.ts:321 | `export function makeOrder(lines: CartLine[], profile: Profile, kyc: Kyc): Order` |
| packages/domain/src/index.ts:345 | `export function makeInvoice(lines: CartLine[], profile: Profile, period: string): Invoice` |
| packages/domain/src/index.ts:369 | `export function initialWorkspace(): Workspace` |
| packages/domain/src/index.ts:485 | `export function localDateTime(value: string | number | Date` |

## Frontend/API/function/test anchors

| Path:line | Declaration / route / test |
| --- | --- |
| apps/customer/src/App.tsx:51 | `export default function App() {` |
| apps/customer/src/App.tsx:262 | `<Route path="/" element={<Dashboard onAdvisor={() => setAdvisor(true)} />} />` |
| apps/customer/src/App.tsx:263 | `<Route path="/plans" element={<Plans />} />` |
| apps/customer/src/App.tsx:264 | `<Route path="/discover" element={<Discover />} />` |
| apps/customer/src/App.tsx:265 | `<Route path="/checkout" element={<Checkout />} />` |
| apps/customer/src/App.tsx:266 | `<Route path="/services" element={<Services />} />` |
| apps/customer/src/App.tsx:267 | `<Route path="/orders" element={<Orders />} />` |
| apps/customer/src/App.tsx:268 | `<Route path="/orders/:id" element={<Orders />} />` |
| apps/customer/src/App.tsx:269 | `<Route path="/verification" element={<Verification />} />` |
| apps/customer/src/App.tsx:270 | `<Route path="/billing" element={<Billing />} />` |
| apps/customer/src/App.tsx:271 | `<Route path="/support" element={<Support />} />` |
| apps/customer/src/App.tsx:272 | `<Route path="/account" element={<Account />} />` |
| apps/customer/src/components/Brand.tsx:1 | `export function Brand() {` |
| apps/customer/src/components/Modal.tsx:3 | `export function Modal({` |
| apps/customer/src/components/Modal.tsx:27 | `function key(e: KeyboardEvent) {` |
| apps/customer/src/components/NetworkArt.tsx:1 | `export function NetworkArt() {` |
| apps/customer/src/lib/api.ts:2 | `export class ApiError extends Error {` |
| apps/customer/src/lib/api.ts:11 | `export const cloudConfigured = Boolean(base && !base.includes('YOUR_'));` |
| apps/customer/src/lib/api.ts:12 | `async function request<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {` |
| apps/customer/src/lib/api.ts:33 | `export const customerApi = {` |
| apps/customer/src/lib/api.ts:34 | `profile: (token: string) => request<Profile>('/v1/me', token),` |
| apps/customer/src/lib/api.ts:35 | `saveProfile: (token: string, profile: Profile) =>` |
| apps/customer/src/lib/api.ts:37 | `quote: (token: string, lines: CartLine[]) =>` |
| apps/customer/src/lib/api.ts:39 | `orders: (token: string) => request<Order[]>('/v1/orders', token),` |
| apps/customer/src/lib/api.ts:40 | `order: (token: string, id: string) =>` |
| apps/customer/src/lib/api.ts:42 | `invoices: (token: string) => request<Invoice[]>('/v1/invoices', token),` |
| apps/customer/src/lib/api.ts:43 | `upload: (token: string, file: { name: string; type: string; size: number }) =>` |
| apps/customer/src/lib/auth.ts:25 | `export function authManager() {` |
| apps/customer/src/lib/auth.ts:45 | `export async function signIn() {` |
| apps/customer/src/lib/auth.ts:61 | `export function finishSignIn() {` |
| apps/customer/src/lib/auth.ts:70 | `export async function signOut() {` |
| apps/customer/src/lib/downloads.ts:4 | `export async function download(blob: Blob, name: string) {` |
| apps/customer/src/lib/downloads.ts:38 | `export async function invoicePdf(invoice: Invoice, profile: Profile) {` |
| apps/customer/src/lib/downloads.ts:131 | `export async function downloadInvoice(invoice: Invoice, profile: Profile) {` |
| apps/customer/src/lib/downloads.ts:138 | `export async function downloadStatement(invoices: Invoice[]) {` |
| apps/customer/src/lib/downloads.ts:158 | `export async function downloadCalendar(id: string, slot: string) {` |
| apps/customer/src/lib/feedback.tsx:4 | `export function FeedbackProvider({ children }: { children: ReactNode }) {` |
| apps/customer/src/lib/feedback.tsx:31 | `export const useNotify = () => useContext(C);` |
| apps/customer/src/lib/store.tsx:11 | `function load() {` |
| apps/customer/src/lib/store.tsx:29 | `export function WorkspaceProvider({ children }: { children: ReactNode }) {` |
| apps/customer/src/lib/store.tsx:48 | `export function useWorkspace() {` |
| apps/customer/src/pages/Account.tsx:22 | `export default function Account() {` |
| apps/customer/src/pages/Account.tsx:31 | `function save(e: React.FormEvent) {` |
| apps/customer/src/pages/Account.tsx:42 | `async function checkConnection() {` |
| apps/customer/src/pages/Billing.tsx:18 | `export default function Billing() {` |
| apps/customer/src/pages/Billing.tsx:29 | `async function pdf(i: Invoice) {` |
| apps/customer/src/pages/Billing.tsx:55 | `function payDemo() {` |
| apps/customer/src/pages/Billing.tsx:326 | `function ShieldIcon() {` |
| apps/customer/src/pages/Checkout.tsx:16 | `export default function Checkout() {` |
| apps/customer/src/pages/Checkout.tsx:23 | `function place() {` |
| apps/customer/src/pages/Dashboard.tsx:26 | `export default function Dashboard({ onAdvisor }: { onAdvisor: () => void }) {` |
| apps/customer/src/pages/Discover.tsx:45 | `export default function Discover() {` |
| apps/customer/src/pages/Discover.tsx:67 | `function next() {` |
| apps/customer/src/pages/Orders.tsx:31 | `export default function Orders() {` |
| apps/customer/src/pages/Plans.tsx:31 | `export default function Plans() {` |
| apps/customer/src/pages/Services.tsx:17 | `export default function Services() {` |
| apps/customer/src/pages/Support.tsx:50 | `export default function Support() {` |
| apps/customer/src/pages/Support.tsx:59 | `function submit(e: React.FormEvent) {` |
| apps/customer/src/pages/Verification.tsx:19 | `export default function Verification() {` |
| apps/customer/src/pages/Verification.tsx:24 | `function files(list: FileList  /  null) {` |
| apps/customer/src/pages/Verification.tsx:52 | `function verify() {` |
| infra-placeholder/api/index.mjs:16 | `async function storageCheck() {` |
| infra-placeholder/api/index.mjs:27 | `async function checkTable(label, variable) {` |
| infra-placeholder/api/index.mjs:66 | `async function checkDocuments() {` |
| infra-placeholder/api/index.mjs:106 | `export const handler = async (event = {}) => {` |
| packages/domain/src/index.ts:22 | `export const catalogue = rawCatalogue as Product[];` |
| packages/domain/src/index.ts:23 | `export const CATALOGUE_VERSION = 'case-2026-07-v1';` |
| packages/domain/src/index.ts:24 | `export const DEMO_TAX_BPS = 1800;` |
| packages/domain/src/index.ts:25 | `export const profileSchema = z.object({` |
| packages/domain/src/index.ts:53 | `export const orderSteps: OrderStatus[] = [` |
| packages/domain/src/index.ts:61 | `export const statusLabels: Record<OrderStatus, string> = {` |
| packages/domain/src/index.ts:145 | `export function money(paise: number, decimals = true) {` |
| packages/domain/src/index.ts:153 | `export const productById = (id: string) => catalogue.find((p) => p.id === id);` |
| packages/domain/src/index.ts:154 | `export function eligibility(p: Product, profile: Profile): string[] {` |
| packages/domain/src/index.ts:164 | `export function defaultQuantity(p: Product, profile: Profile) {` |
| packages/domain/src/index.ts:170 | `export function addToCart(lines: CartLine[], id: string, profile: Profile): CartLine[] {` |
| packages/domain/src/index.ts:187 | `export function removeFromCart(lines: CartLine[], id: string): CartLine[] {` |
| packages/domain/src/index.ts:202 | `export function quote(lines: CartLine[], profile: Profile): Quote {` |
| packages/domain/src/index.ts:239 | `export function recommendations(profile: Profile) {` |
| packages/domain/src/index.ts:286 | `export function nextOrder(order: Order): Order {` |
| packages/domain/src/index.ts:303 | `export function cancelOrder(order: Order): Order {` |
| packages/domain/src/index.ts:319 | `export const makeId = (prefix: string) =>` |
| packages/domain/src/index.ts:321 | `export function makeOrder(lines: CartLine[], profile: Profile, kyc: Kyc): Order {` |
| packages/domain/src/index.ts:345 | `export function makeInvoice(lines: CartLine[], profile: Profile, period: string): Invoice {` |
| packages/domain/src/index.ts:369 | `export function initialWorkspace(): Workspace {` |
| packages/domain/src/index.ts:485 | `export function localDateTime(value: string  /  number  /  Date = Date.now()): string {` |
| tests/domain.test.ts:21 | `describe('case catalogue and monetary contract', () => {` |
| tests/domain.test.ts:22 | `it('uses paise consistently and avoids 100x pricing errors', () => {` |
| tests/domain.test.ts:27 | `it('rejects invalid quantities, duplicate and unknown products', () => {` |
| tests/domain.test.ts:43 | `it('keeps each product eligible only when its constraints hold', () => {` |
| tests/domain.test.ts:58 | `describe('dependency-aware bundle selection', () => {` |
| tests/domain.test.ts:59 | `it('adds one eligible OR dependency, reuses an existing one, and cascades removals', () => {` |
| tests/domain.test.ts:69 | `it('preserves an add-on when an alternate dependency still exists', () => {` |
| tests/domain.test.ts:77 | `it('produces valid recommendations for diverse eligible profiles', () => {` |
| tests/domain.test.ts:98 | `describe('order and invoice lifecycle', () => {` |
| tests/domain.test.ts:99 | `it('gates checkout on demo verification, valid cart and profile eligibility', () => {` |
| tests/domain.test.ts:113 | `it('advances sequentially, records events and forbids invalid terminal transitions', () => {` |
| tests/domain.test.ts:130 | `it('snapshots cart and invoice amounts independently of subsequent edits', () => {` |
| tests/domain.test.ts:141 | `it('validates profile inputs and seeded demo invoices reconcile', () => {` |
| tests/domain.test.ts:151 | `it('round-trips installation times through local-clock inputs', () => {` |
| tests/domain.test.ts:157 | `it('generates a valid multi-page PDF for a large consolidated invoice', async () => {` |
| tests/domain.test.ts:172 | `it('keeps invoice billing details fixed after account changes', () => {` |
| tests/e2e/customer.spec.ts:3 | `test('discover → verify → order → tracking → billing survives reload', async ({ page }) => {` |
| tests/e2e/customer.spec.ts:47 | `test('catalogue dependencies, comparison, saved plans and checkout arithmetic', async ({` |
| tests/e2e/customer.spec.ts:81 | `test('support form stays focused, saves locally, resolves, and global search works', async ({` |
| tests/e2e/customer.spec.ts:102 | `test('all customer routes fit the viewport and remain usable on mobile', async ({ page }, info) => {` |
| tests/e2e/customer.spec.ts:141 | `test('customer pages expose accessible controls and readable content', async ({ page }) => {` |
| tests/e2e/customer.spec.ts:159 | `test('rescheduling preserves India local time in the calendar and cancellation persists', async ({` |

## Complete source/text manifest

| Path | Lines | SHA-256 |
| --- | --- | --- |
| .env.example | 33 | 06e29c05b2836de36e2495c0dc215f402002a2999fcc69bff8bf01e585c414c6 |
| .gitattributes | 3 | 09170afe1aa572054cd4e1c629114c6dd85b41b13cfc20aa583b9c391b8426fb |
| .gitignore | 28 | e6310180bc616ef25a473f7065a4cb21ea1cff2871d295c90bf176668403f704 |
| .prettierrc.json | 1 | f583ff6d8ba542b76af46c4c024a0941b77aee51133bb0f69ec6eb1fa613de7e |
| README.md | 186 | a88f13d95a0d1d8fcd7cb04f53815817bb770eabbc8d6a7e0b5996a171ad10e7 |
| apps/customer/README.md | 69 | 9ec07cda113c6ed0e727579f464683e07c60838afb0235fa5ef08e87cfecf471 |
| apps/customer/android/.gitignore | 101 | 065e4a92a240fe11a0ea230491ad9dabef143f5fd5a3e6884ad6f0395666a971 |
| apps/customer/android/app/.gitignore | 2 | 99c54e51ee601a60fbde8016b2cbf717483bc2e92773be86c9247d02a7fa6ea4 |
| apps/customer/android/app/build.gradle | 54 | a63cb9260dccf7853dab8493854102ada59af9f6f964c59cdb5140e6bd362a09 |
| apps/customer/android/app/capacitor.build.gradle | 21 | 1a206364d18e8efe8cc1f390dffa25ebab7a8b8d60c607cd4bef2e67d605672b |
| apps/customer/android/app/proguard-rules.pro | 21 | 1cf8c57e8f79c250b0af9c1a5a4edad71a5c348a79ab70243b6bae086c150ad2 |
| apps/customer/android/app/src/main/AndroidManifest.xml | 42 | 88b4848f379e4e9c27b320576b89d877c17b09d9e0bfe87e10d5834da583ced2 |
| apps/customer/android/app/src/main/java/com/airtelsync/customer/MainActivity.java | 5 | ea8a4703cdb8d30087e6999f6b472b9cbbd31ac9d2bd3dec043ab7b5e6ba6ebb |
| apps/customer/android/app/src/main/res/drawable/ic_sync_foreground.xml | 1 | 0ea203f0f2797d73d1b2ae76d3c87117854a434a3e2f18b0bc54eb12d95609a8 |
| apps/customer/android/app/src/main/res/drawable/splash.xml | 5 | 0f30501ac76184b9a70b8dab47da59a0361bd9700ada5c0c711ffb8c99c774a6 |
| apps/customer/android/app/src/main/res/layout/activity_main.xml | 12 | 5d770feb791313b947020cbfc57e5c733c556dac5e9e49261a1190e527073253 |
| apps/customer/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml | 1 | da1454fcde676b97d8309657f2e82e9cb863d45b815de98789572d3ae8a98c76 |
| apps/customer/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml | 1 | da1454fcde676b97d8309657f2e82e9cb863d45b815de98789572d3ae8a98c76 |
| apps/customer/android/app/src/main/res/mipmap-anydpi/ic_launcher.xml | 1 | ce9ff4b0d8a3d3d435476d74f68cb1c17a6d4c9069b22ecc4a208a9001423669 |
| apps/customer/android/app/src/main/res/mipmap-anydpi/ic_launcher_round.xml | 1 | ce9ff4b0d8a3d3d435476d74f68cb1c17a6d4c9069b22ecc4a208a9001423669 |
| apps/customer/android/app/src/main/res/values/colors.xml | 2 | 0d3b3acfe4af197be8c213566f37f019ac480cb2cea8543695822aec80bc8fa5 |
| apps/customer/android/app/src/main/res/values/strings.xml | 7 | a38ecf58161dc237ab9c2c71e23405e1d869b2dc20f851e765aa6c4009c36de3 |
| apps/customer/android/app/src/main/res/values/styles.xml | 22 | 78eded8d2a2f7c89cedde405324344d36e5ef6513dc7b6fafe92ded74e21cf4c |
| apps/customer/android/app/src/main/res/xml/file_paths.xml | 4 | ea7fad5542cdee503e47daaa9c58adaac871c6b94695e03a9915f2dd48923c5f |
| apps/customer/android/build.gradle | 29 | e2aa5075e1fcfd5e77c63eb8d662932b3c8586c927376b88a4986365af3b635f |
| apps/customer/android/capacitor.settings.gradle | 12 | 09f1c9989dd69de55e0056a66966edbca54b1b9760dc2b45a0df5b238ea791c8 |
| apps/customer/android/gradle.properties | 22 | 3bab15c5b8bc4c2f4b6cf525497d15ad4abca53a460e6dd2eb0f0135817d31e6 |
| apps/customer/android/gradle/wrapper/gradle-wrapper.properties | 7 | 9a479a85aa879bb55284fc16d0de5b81a745c3854f4e2d88c42e7debaf007435 |
| apps/customer/android/gradlew | 251 | b187b4c52e749f5760afdd6fadc31b2a98ad35fb249bf0dff03b72650f320409 |
| apps/customer/android/gradlew.bat | 94 | 1d297e00bd21de3ace22b4d7f2de1f9dfa858883d66bbf7c1ccbecccec8f4f3b |
| apps/customer/android/settings.gradle | 5 | 6ce098d15ebd69b44c4ecd786bca1bdc366340d2459b2af4d7bb0ab317aa9669 |
| apps/customer/android/variables.gradle | 16 | 83d502c9ed8fcf1dd4791482067abeedbebae49fafe9cd14a8a1f5891deb0d88 |
| apps/customer/capacitor.config.ts | 9 | d932565932ec45e8dbff691b94375b3f276c295d41251a342de63ca354d934cb |
| apps/customer/index.html | 18 | 9b85cdc56662241f778e3bb446d7825d33c605189d075c5b7d66e3b615a9aa64 |
| apps/customer/package.json | 29 | 358af0132851e176674810612d574ed22d39ce8b7388c688fa380e0996627d29 |
| apps/customer/public/favicon.svg | 1 | b373c61441e5a584c857fd220aa17bb116ac2122f4f83488b51f1efbade8c0d8 |
| apps/customer/src/App.tsx | 454 | 27512d61736589cee91a71415ebc9f3c52d968bfd75ce46cfb28f1151868da06 |
| apps/customer/src/components/Brand.tsx | 19 | 607be374b61e390c9d9dbad6b438b9ba8d24d6c4a8948a3216254cd23044828a |
| apps/customer/src/components/Modal.tsx | 76 | 52df29b5fc7cf55f79ca6b76d9629b967ea5a2bfe9871aa3e839a1698804de03 |
| apps/customer/src/components/NetworkArt.tsx | 90 | 30fdd294661f371649bdb8597a1eb3859e6c21bb12d880423a15ed2c596e54df |
| apps/customer/src/lib/api.ts | 50 | f3d16110cad42f583c3f7d63126a9599e663a986f1276d1c93e94f69ec855089 |
| apps/customer/src/lib/auth.ts | 80 | bf9741b39c667e5875b9d93b695731fa88e4acd11926e9e7968252e89af76f37 |
| apps/customer/src/lib/downloads.ts | 181 | 636e0813fd46efef0aaddfffdebc884242a682ce084905ce20befb2e95391c5b |
| apps/customer/src/lib/feedback.tsx | 31 | 7d0fed2592c72d7c12ee895c38b067a50b8edcf7fa83ce67fb45cbf54d9209b9 |
| apps/customer/src/lib/store.tsx | 52 | e75f366b3984363c395bdff6b0b2a1c68c3cf09bd3f8545e7493c56f40cce3af |
| apps/customer/src/main.tsx | 22 | 6025d3678efa3a0a126eb1dff5a9484b37d3ba987ff5d6ecbea4fb3bd9f822fe |
| apps/customer/src/pages/Account.tsx | 265 | 7fee650d857f9c449d1ebc9d07cdeefe09c66712171a3c1178ab30837a45eb36 |
| apps/customer/src/pages/Billing.tsx | 332 | 82c427c28095617caa87d35b409b05731144a6930120ba6f4ee1633cdae2c7a7 |
| apps/customer/src/pages/Checkout.tsx | 248 | 48825d4db29c7baf1df34f9bf9c781b6239828d7134f33f8153d9b176947efad |
| apps/customer/src/pages/Dashboard.tsx | 365 | b2e52817c802aca88dc909078730c3504f1ae34817204a270a7e457b851cf528 |
| apps/customer/src/pages/Discover.tsx | 415 | edc8110e4390fee96cc30e349aba879d4578a5c6ccdb038855d52914b53cecec |
| apps/customer/src/pages/Orders.tsx | 455 | 335dd36d32a9440bcea568a3f206b2ac7324f9f75b8c204b4d55fd264a0cda9f |
| apps/customer/src/pages/Plans.tsx | 394 | 44cd252349e89c15750e8cc200e962ba5b2a545dc3cfe80b21e477f7c37dfe0f |
| apps/customer/src/pages/Services.tsx | 198 | a6bfcff00078b545eb2cb60b8e2fe0ab9959c3e51435986ae0a490dd54c59d00 |
| apps/customer/src/pages/Support.tsx | 246 | df4ce682876124179210108c7682d109b9d556a309afed43f2378a2c15ac5241 |
| apps/customer/src/pages/Verification.tsx | 307 | bc77becc09485b267eb19fe5c9985fb16f05895006bb490edaad14ab15594288 |
| apps/customer/src/styles.css | 5043 | 1935837d8031b39b23eed935612e365d222dc587f187f5c460ab0256d7a5e25e |
| apps/customer/vite.config.ts | 15 | 06ba517aeaec1de11fd5db34ccaae1024cd24f508192d6de79c2646974b597e9 |
| case_source/CONTENTS.md | 12 | 1025398a2a187586157d7e4e0ff5107502d9034ed1c346d18d432c855450cfae |
| case_source/README.md | 69 | 9eadd69ff1174519fb94fcd662af1a8f7d2318aa9433e588922e81c4fb4aea26 |
| case_source/mock_gstin_registry.csv | 3535 | 53f18df9ef8298dfc02640aedca6329805167d4b414499b763b493f48095f33a |
| case_source/mock_udyam_registry.csv | 2724 | 588ae3503180dd3404bebe1eab480a7c57b637ca0d40a50ae636005f6a59032f |
| case_source/product_catalogue.csv | 26 | 5110529705bda36f668cfc92e7de943a4d3c6d5b7f78ae35c4d7b0484a136e0c |
| case_source/smb_leads.csv | 5001 | b2521e8cedcf3b5775a087d40d07f548afbe3e7094a9fbad3a3908ffb01120ea |
| docs/architecture.md | 313 | cb3e18284caa021da65f5325e42ef8a447fc60035f763f389d3f3354ad3cf029 |
| docs/customer-api-handoff.md | 29 | b3156047fad3b1f29c58e638b7d1bf5b10e44711d5efc875e53fc1b26b52b956 |
| docs/implementation-plan.md | 89 | 6df1a3dcc4d244209c45744aad4f45796a757b10c75ce63c56a6f8e2283386a6 |
| infra-placeholder/README.md | 98 | 5a34eb3f25e2ba14a6c3dd8b2ad611c2341ad94483869ff0509cfee52480e902 |
| infra-placeholder/api/documents-cors.json | 9 | 7c99b80c4aeeb455217bc060a2dfe13237507a6f095a487083a2deeb3e70a0b4 |
| infra-placeholder/api/events/health-check.json | 1 | ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356 |
| infra-placeholder/api/events/storage-check.json | 3 | c040695e6a23d72b41f04537cfedb71859ba1a15946e4a8859cab6e937920f41 |
| infra-placeholder/api/http-api-cors.json | 19 | 977ed28c3065a06dfd906009640ca25e7c50998ef718680239c5fbf63a93150d |
| infra-placeholder/api/index.mjs | 112 | b8cf750af93f7a7d407bd898f4286b21b165aafdc481916b155e20a39d0f3e57 |
| infra-placeholder/aws-prototype-config.example.json | 39 | 1ad57222d8bc8073c2b4310b17b1ee895b468656cd5eecd8e8c4650e44fab8f7 |
| infra-placeholder/index.html | 25 | 7639bfa5e66cd77e79945c4ff73bf0ebdad9fb109591a3233e97bceaf018e63f |
| package-lock.json | 3112 | 13c86b57baad64e53994e8a70c7cd84241091bfc4c41ad1a1a5dcb6593a566b3 |
| package.json | 39 | 36d1bbbb117759657a19d3737985f6cae8e01ad5f1625e5a214e60bde7318785 |
| packages/domain/package.json | 10 | 425263d14e8a7de19b9cd1ce356fb4fc541158cedc074af450b10df9df2f2aae |
| packages/domain/src/index.ts | 490 | 186b250278809d52c79adbfcf256aabfd62dcd3c1ac17013ca41ea5c4e790ac2 |
| playwright.config.ts | 27 | b427e46eca93a1ee8e5dedc28455e31ccbe7b6d4274daee72a31e5988ac8c503 |
| reference/initial-scaffold/README.md | 12 | 2cdf03319fa2bca146686790d1d4eb4c9c3d44df2a055d3cc0e0b2134a5ffabb |
| reference/initial-scaffold/index.html | 2 | f38a6de45479baaf085acd3ddaa43b004a4f8106cc9dd1ab51fdc0519b808671 |
| reference/initial-scaffold/package.json | 53 | d3de932bdecf8954c94bf13a58d30deb057821900f4bb673661d234e1732ea7a |
| reference/initial-scaffold/tsconfig.json | 10 | d23065a74e35a3ce49460a88e25f84fba2e0bdbb2f885fc57abfdadb4a2975aa |
| reference/initial-scaffold/vite.config.ts | 3 | e7fb92076fab451bad74f8ec72488d0c16c1188fd4388b2e396909ebacc4a6fe |
| scripts/check-staged.mjs | 5 | 3fbbfa6d1d624004dbd5c7c5a5e746f0d2c1e0c7c95874f64721a62860af2bd5 |
| shared/data/README.md | 18 | 71b11bd76bc01d70cd7d972b881d1013001f28de3a412134e58072f1ba3fd8c5 |
| shared/data/catalogue.json | 650 | 3abba2e933d9f3e6185975a4ccb814d1d0ea2229132c97950987e537c3150091 |
| shared/data/historical.json | 60 | b64fe4beb4b2a18aaef8e904fee5c5a73cbedfa9b05a4c44082f2d05c66c4acd |
| shared/data/mock_gstin_registry.json | 1 | f78a808ea86826df14863efa17c58bffdbb8238e009d160d28553b71f196b2df |
| shared/data/mock_udyam_registry.json | 1 | a2a081922dddef50b08e9d7517641a61420af8aa4db69bfecefa75f98373fe25 |
| tests/domain.test.ts | 179 | 3a4aae362902d4d92142ea5f557264ab0fafde9a63ad0edd41e5395118069088 |
| tests/e2e/customer.spec.ts | 188 | 889f21f6fa9b4875535371ce6e7f6ca576d43ecb2cb9b7cef37387aa7b055ca9 |
| tsconfig.json | 24 | d2662f03105517b857fa754b35bb1996662aabfdb9edb91899a19f8a263700f7 |
| vitest.config.ts | 2 | 31ecac77543ab4c38dbb56bebad072071cf1640467629db472da0c91c6e8097e |

## Specimen image inventory

VERIFIED IN CODE: PNG filenames below. Visual/semantic outcomes are UNVERIFIED unless separately stated; OCR observations are provisional in08.

| Applicant | Files |
| --- | --- |
| K01 | case_source/kyc_documents/K01_address_proof.png, case_source/kyc_documents/K01_gst_certificate.png, case_source/kyc_documents/K01_signatory_id.png, case_source/kyc_documents/K01_udyam_certificate.png |
| K02 | case_source/kyc_documents/K02_address_proof.png, case_source/kyc_documents/K02_gst_certificate.png, case_source/kyc_documents/K02_signatory_id.png, case_source/kyc_documents/K02_udyam_certificate.png |
| K03 | case_source/kyc_documents/K03_address_proof.png, case_source/kyc_documents/K03_gst_certificate.png, case_source/kyc_documents/K03_signatory_id.png, case_source/kyc_documents/K03_udyam_certificate.png |
| K04 | case_source/kyc_documents/K04_address_proof.png, case_source/kyc_documents/K04_gst_certificate.png, case_source/kyc_documents/K04_signatory_id.png, case_source/kyc_documents/K04_udyam_certificate.png |
| K05 | case_source/kyc_documents/K05_address_proof.png, case_source/kyc_documents/K05_gst_certificate.png, case_source/kyc_documents/K05_signatory_id.png |
| K06 | case_source/kyc_documents/K06_address_proof.png, case_source/kyc_documents/K06_gst_certificate.png, case_source/kyc_documents/K06_signatory_id.png, case_source/kyc_documents/K06_udyam_certificate.png |
| K07 | case_source/kyc_documents/K07_address_proof.png, case_source/kyc_documents/K07_gst_certificate.png, case_source/kyc_documents/K07_signatory_id.png, case_source/kyc_documents/K07_udyam_certificate.png |
| K08 | case_source/kyc_documents/K08_address_proof.png, case_source/kyc_documents/K08_gst_certificate.png, case_source/kyc_documents/K08_signatory_id.png, case_source/kyc_documents/K08_udyam_certificate.png |
| K09 | case_source/kyc_documents/K09_address_proof.png, case_source/kyc_documents/K09_gst_certificate.png, case_source/kyc_documents/K09_signatory_id.png, case_source/kyc_documents/K09_udyam_certificate.png |
| K10 | case_source/kyc_documents/K10_address_proof.png, case_source/kyc_documents/K10_gst_certificate.png, case_source/kyc_documents/K10_signatory_id.png, case_source/kyc_documents/K10_udyam_certificate.png |
| K11 | case_source/kyc_documents/K11_address_proof.png, case_source/kyc_documents/K11_gst_certificate.png, case_source/kyc_documents/K11_signatory_id.png, case_source/kyc_documents/K11_udyam_certificate.png |
| K12 | case_source/kyc_documents/K12_address_proof.png, case_source/kyc_documents/K12_gst_certificate.png, case_source/kyc_documents/K12_signatory_id.png, case_source/kyc_documents/K12_udyam_certificate.png |
