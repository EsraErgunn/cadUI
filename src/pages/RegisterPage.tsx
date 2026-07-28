import { Link } from "react-router-dom";

/**
 * İSKELET — içeriği ekip arkadaşı dolduracak.
 * Hesap türü seçimi (Project Firm / Gas Distribution) buraya gelecek.
 *
 * Dış kabuk (kart, kavis, borular, logo) AuthLayout'ta.
 * Buraya sadece sol kolonun içeriği yazılır.
 * Kolon genişliğini AuthLayout veriyor — burada w-[..] kullanma.
 */
export function RegisterPage() {
  return (
    <div className="flex h-full flex-col justify-center overflow-y-auto overflow-x-hidden pl-[16%] pr-[4%]">
      <p className="text-[24px] font-semibold text-brand-navy">TODO — Create your account</p>

      <Link to="/login" className="mt-4 text-[13px] text-link-gold">
        &larr; Back to login
      </Link>
    </div>
  );
}