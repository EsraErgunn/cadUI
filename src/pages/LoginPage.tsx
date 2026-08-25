import { CircleAlert, Lock, User } from 'lucide-react'

import { useLoginForm } from './useLoginForm'
import logo from '../assets/brand/logo.st.png'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { PasswordField } from '../ui/admin/form/PasswordField'
import { TextField } from '../ui/admin/form/TextField'

const USERNAME_FIELD_ID = 'login-username'
const PASSWORD_FIELD_ID = 'login-password'

const FORM_TITLE = 'Giriş Yap'

/** Görünmez sayfa başlığı; marka adıyla birlikte okunur (bkz. kullanıldığı yer). */
const BRAND_GREETING = 'Welcome to'

const HEADING = 'Hoş geldiniz'

const DESCRIPTION = 'Devam etmek için hesap bilgilerinizle giriş yapın.'

/** Sağ paneldeki kurumsal ifade. Ürünün ne yaptığını söyler, pazarlama cümlesi değil. */
const BRAND_KICKER = 'Doğal Gaz İç Tesisat'
const BRAND_HEADLINE = 'Projeyi çizin, denetleyin, teslim edin.'
const BRAND_NOTE = 'Plan, izometri ve malzeme dökümü tek projede toplanır.'

/**
 * Marka paneli — YALNIZ `lg` ve üstünde. Dar ekranda gizleniyor çünkü tek
 * kolona inince formun üstünde ikinci bir ekran boyu dolgu olurdu; oradaki
 * marka görevini sol sütunun tepesindeki küçük kilit üstleniyor.
 */
function BrandPanel() {
  return (
    <section
      aria-label="StarCAD"
      className="relative hidden overflow-hidden border-l border-edge bg-surface-sunken lg:flex lg:items-center lg:justify-center"
    >
      {/* Dekoratif çizim ızgarası; içerik `relative` ile üstünde kalıyor. */}
      <div aria-hidden className="auth-grid absolute inset-0" />

      <div className="relative flex max-w-md flex-col items-center gap-6 px-10 text-center">
        <img
          src={logo}
          alt=""
          aria-hidden
          className="size-24 rounded-2xl border border-edge object-contain"
        />

        <span aria-hidden className="h-px w-12 bg-accent" />

        <div>
          {/* Sol menüdeki bölüm başlığıyla aynı tipografi. */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            {BRAND_KICKER}
          </p>
          <p className="mt-3 text-xl font-semibold leading-snug text-ink">{BRAND_HEADLINE}</p>
          <p className="mt-3 text-sm text-ink-muted">{BRAND_NOTE}</p>
        </div>
      </div>
    </section>
  )
}

export function LoginPage() {
  // Form durumu ve giriş isteği ayrı dosyada: burası düzen, orası akış.
  const { username, setUsername, password, setPassword, error, isSubmitting, handleSubmit } =
    useLoginForm()

  return (
    // `lg` altında tek kolon: ızgara yalnız geniş ekranda ikiye ayrılıyor, yani
    // dar ekranda sağ panel hiç yer kaplamıyor ve yatay taşma doğuramıyor.
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
        {/* Formun genişliği ekrandan bağımsız: geniş ekranda kolon uzasa da
            alanlar 24rem'de kalıyor, satır uzunluğu okunur ölçüde duruyor. */}
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          {/* Marka burada KÜÇÜK: bakış akışının başlangıç noktası olacak kadar
              var, formun önüne geçecek kadar değil. Geniş ekranda büyük hâli
              zaten sağ panelde. */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="" aria-hidden className="size-7 shrink-0 rounded-md object-contain" />
            {/* Sayfanın h1'i marka karşılaması; EKRANDA görünmüyor çünkü arayüz
                metni Türkçe ve karşılama görevini aşağıdaki "Hoş geldiniz"
                üstleniyor. Ekran okuyucuda hemen ardından gelen marka adıyla
                birlikte "Welcome to StarCAD" diye okunuyor — giriş ekranının
                eskiden beri taşıdığı kimlik bu. Metin SABİT: `AppRouter`
                duman testi (K112) giriş ekranını bu başlıktan tanıyor. */}
            <h1 className="sr-only">{BRAND_GREETING}</h1>
            <span className="text-sm font-semibold text-ink">StarCAD</span>
          </div>

          <div>
            {/* h2: sayfanın kimliğini h1 taşıyor, bu satır formun karşılaması. */}
            <h2 className="text-2xl font-semibold text-ink">{HEADING}</h2>
            <p className="mt-2 text-sm text-ink-muted">{DESCRIPTION}</p>
          </div>

          {/* `NoticeBar` DEĞİL: o bileşen kapatma eylemini zorunlu kılıyor,
              `useLoginForm` ise hatayı yalnız yeni denemede temizliyor —
              kapatılabilir şerit, işlevi olmayan bir düğme demekti. */}
          {error !== undefined && (
            <p
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-edge bg-surface-sunken px-4 py-3 text-sm text-ink"
            >
              <CircleAlert aria-hidden className="size-5 shrink-0 text-danger" />
              {error}
            </p>
          )}

          <form noValidate aria-label={FORM_TITLE} onSubmit={handleSubmit}>
            {/* `fieldset` gönderim sürerken alanları ve düğmeyi tek hamlede
                kilitler (ChangePasswordDialog ile aynı desen). */}
            <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-5">
              {/* Uç e-posta değil username istiyor (AuthController). */}
              <TextField
                id={USERNAME_FIELD_ID}
                label="Kullanıcı Adı"
                leftIcon={User}
                autoComplete="username"
                value={username}
                onChange={setUsername}
              />

              <PasswordField
                id={PASSWORD_FIELD_ID}
                label="Şifre"
                leftIcon={Lock}
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
              />

              <button
                type="submit"
                aria-busy={isSubmitting}
                className={adminButtonVariants({ tone: 'primary', className: 'mt-1 w-full' })}
              >
                {isSubmitting ? 'Giriş yapılıyor…' : FORM_TITLE}
              </button>
            </fieldset>
          </form>
        </div>
      </main>

      <BrandPanel />
    </div>
  )
}
