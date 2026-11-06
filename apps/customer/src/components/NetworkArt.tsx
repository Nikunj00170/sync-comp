import { useI18n } from '../lib/i18n';
export function NetworkArt() {
  const { t, locale } = useI18n();
  return (
    <div className="network-art" aria-hidden="true">
      <svg viewBox="0 0 430 270" fill="none">
        <defs>
          <linearGradient
            id="office"
            x1="171"
            y1="71"
            x2="269"
            y2="204"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#f7b7ba" />
          </linearGradient>
          <linearGradient id="base" x1="80" y1="100" x2="340" y2="250">
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#ef959a" />
          </linearGradient>
        </defs>
        <ellipse cx="222" cy="214" rx="126" ry="32" fill="#e40000" opacity=".06" />
        <path
          d="M58 184 208 266 374 175 224 92 58 184Z"
          fill="url(#base)"
          stroke="#fff"
          strokeWidth="2"
        />
        <path d="m58 184 150 82v-12L58 172v12Z" fill="#e89196" />
        <path d="m208 266 166-91v-12l-166 91v12Z" fill="#f2afb3" />
        <path
          d="M208 115v104m-67-139 132 74m-201 19 202-113m-133 155 201-111"
          stroke="#fff"
          strokeWidth="2"
          opacity=".75"
        />
        <path d="m173 112 67-38 63 36-68 40-62-38Z" fill="#fff" stroke="#f6d4d5" />
        <path d="m173 112 62 38v83l-62-36v-85Z" fill="#edb6ba" />
        <path d="m235 150 68-40v84l-68 39v-83Z" fill="url(#office)" />
        <path
          d="m185 132 14 8v18l-14-8v-18Zm24 14 13 8v18l-13-8v-18Zm-24 34 14 8v18l-14-8v-18Zm24 14 13 8v18l-13-8v-18Z"
          fill="#fff"
          opacity=".9"
        />
        <path
          d="m248 153 13-8v16l-13 8v-16Zm24-14 13-8v16l-13 8v-16Zm-24 43 13-8v16l-13 8v-16Zm24-14 13-8v16l-13 8v-16Z"
          fill="#c44852"
          opacity=".55"
        />
        <path d="m225 88 14-8 12 7-14 8-12-7Z" fill="#e40000" />
        <path
          d="m240 78 0-21m-14-6c8-8 20-8 28 0m-37-8c13-14 32-14 46 0m-55-9c18-21 47-21 65 0"
          stroke="#e40000"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M101 96v55l66 37m173-97v59l-38 24M95 222v-29m252 20v-30"
          stroke="#e40000"
          strokeWidth="2"
          strokeDasharray="4 5"
          opacity=".4"
        />
        <circle cx="101" cy="86" r="24" fill="white" stroke="#f2d8da" />
        <path
          d="m92 87 6 6 12-14"
          stroke="#e40000"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="341" cy="80" r="26" fill="white" stroke="#f2d8da" />
        <rect x="329" y="67" width="24" height="22" rx="4" stroke="#e40000" strokeWidth="2" />
        <path
          d="M335 94h12m-6-5v5m-5-20h10m-10 5h5"
          stroke="#e40000"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="93" cy="223" r="6" fill="#e40000" />
        <circle cx="348" cy="215" r="6" fill="#e40000" />
        <circle cx="141" cy="56" r="3" fill="#ee8b92" />
        <circle cx="306" cy="229" r="3" fill="#ee8b92" />
      </svg>
      <div className="art-pill">
        <span />{t(" Everything, working together.")}</div>
    </div>
  );
}
