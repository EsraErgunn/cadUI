import { useState } from "react";
import { Link } from "react-router-dom";

import leftPipe from "../assets/images/auth/leftpipe.png";
import panelBg from "../assets/images/auth/panel-bg.png";
import rightPipe from "../assets/images/auth/rightpipe.png";

/* ────────────────────────────────────────────────────────────
   SAĞ PANEL — arka plan + logo tek görselde

   x / width : görselin viewBox içindeki yatay konumu.
               Logo panelin ortasında değilse x'i kaydır
               (büyütürsen sağa, küçültürsen sola gider).
   ──────────────────────────────────────────────────────────── */
const PANEL = {
  x: 551,
  width: 650,
  opacity: 1,
};

/* ────────────────────────────────────────────────────────────
   KAVİS
   C x1 y1, x2 y2, x y → son çift varış, ilk ikisi kontrol noktası
   Genlik için ikinci C'nin x değerlerini oynat.
   Kavis değişirse aşağıdaki kolon yüzdesini de güncelle.
   ──────────────────────────────────────────────────────────── */
const CURVE = `M 700 0
  C 600 70, 562 155, 588 258
  C 615 372, 700 412, 682 512
  C 664 612, 556 652, 542 720`;

const PANEL_SHAPE = `${CURVE} L 1180 720 L 1180 0 Z`;

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[#DDE3EC] p-6">
      <div className="relative h-full max-h-[560px] min-h-[400px] w-full max-w-[920px]
                      overflow-hidden rounded-[28px] bg-[#F7F8FA] shadow-2xl">

        {/* 1 — kavis + lacivert panel (arka plan görseli logoyu da içeriyor) */}
        <svg
          viewBox="0 0 1180 720"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="panelFallback" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#243657" />
              <stop offset="50%" stopColor="#1B2A4A" />
              <stop offset="100%" stopColor="#131F38" />
            </linearGradient>

            <linearGradient id="curveLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC107" stopOpacity="0.55" />
              <stop offset="25%" stopColor="#FFD873" stopOpacity="1" />
              <stop offset="55%" stopColor="#FFF0C4" stopOpacity="1" />
              <stop offset="80%" stopColor="#FFC107" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFC107" stopOpacity="0.5" />
            </linearGradient>

            <filter id="softGlow" x="-60%" y="-20%" width="220%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>

            <clipPath id="panelClip">
              <path d={PANEL_SHAPE} />
            </clipPath>
          </defs>

          {/* görsel yüklenene kadar altta duran zemin */}
          <path d={PANEL_SHAPE} fill="url(#panelFallback)" />

          {/* arka plan + logo, kavise kırpılmış */}
          <image
            href={panelBg}
            x={PANEL.x}
            y={0}
            width={PANEL.width}
            height={720}
            opacity={PANEL.opacity}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#panelClip)"
          />

          {/* kenardaki yumuşak ışık */}
          <path
            d={CURVE}
            stroke="#FFE9A8"
            strokeWidth="16"
            strokeOpacity="0.35"
            fill="none"
            filter="url(#softGlow)"
          />

          {/* ince altın çizgi */}
          <path
            d={CURVE}
            stroke="url(#curveLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* 2 — sol kolon, form */}
        <div className="relative z-10 flex h-full w-[46%] flex-col justify-center
                        overflow-y-auto overflow-x-hidden pl-[16%] pr-[4%]">

          <h1 className="whitespace-nowrap text-[24px] font-semibold leading-tight text-[#1B2A4A]">
            Welcome to
          </h1>
          <p className="whitespace-nowrap text-[42px] font-bold leading-tight">
            <span className="text-[#FFC107]">Star</span>
            <span className="text-[#1B2A4A]">CAD</span>
          </p>

          <div className="mt-7 space-y-[14px]">
            {/* e-posta */}
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="h-[50px] w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4
                           text-[14px] text-[#1B2A4A] outline-none transition focus:border-[#FFC107]"
              />
            </div>

            {/* şifre */}
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-[50px] w-full rounded-xl border border-gray-200 bg-white pl-11 pr-11
                           text-[14px] text-[#1B2A4A] outline-none transition focus:border-[#FFC107]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* beni hatırla / şifremi unuttum */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <label className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[17px] w-[17px] shrink-0 rounded border-gray-300"
              />
              Remember me
            </label>
            <span className="shrink-0 cursor-pointer whitespace-nowrap text-[13px] text-[#E0A012]">
                 Forgot Password?
            </span>
          </div>

          {/* giriş butonu */}
          <button
            type="button"
            className="mt-6 flex h-[50px] shrink-0 items-center rounded-xl bg-[#FFC107]
                       text-[15px] font-semibold text-[#1B2A4A] transition hover:brightness-95"
          >
            <span className="flex-1">Sign In</span>
            <svg className="mr-5 h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <p className="mt-6 whitespace-nowrap text-center text-[13px] text-gray-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-[#E0A012]">Sign Up</Link>
          </p>
        </div>

        {/* 3 — borular, en üstte */}
        <img
          src={leftPipe}
          alt=""
          className="pointer-events-none absolute -top-[8%] -left-[7.3%] z-20 h-[118%] object-contain object-left"
        />
        <img
          src={rightPipe}
          alt=""
          className="pointer-events-none absolute -top-[9%] -right-[5.3%] z-20 h-[118%] object-contain object-right"
        />
      </div>
    </div>
  );
}