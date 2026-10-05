'use client';

export function Checkout({
  mobile,
  otp,
  total,
  onMobileChange,
  onOtpChange,
  onPlace,
}: {
  mobile: string;
  otp: string;
  total: number;
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onPlace: () => void;
}) {
  return (
    <>
      <input className="mt-5 w-full rounded-xl border p-3" placeholder="Mobile number" value={mobile} onChange={event => onMobileChange(event.target.value)} />
      <input className="mt-3 w-full rounded-xl border p-3" placeholder="OTP 123456" value={otp} onChange={event => onOtpChange(event.target.value)} />
      <button onClick={onPlace} className="tap mt-4 w-full bg-lime">PLACE PICKUP ORDER · ₹{total}</button>
    </>
  );
}
