const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(amount: number | string | null | undefined): string {
  const parsed = typeof amount === "number" ? amount : Number(amount ?? 0);
  return INR_FORMATTER.format(Number.isFinite(parsed) ? parsed : 0);
}
