/**
 * API hata mesajı normalizasyonu (DRY).
 *
 * FastAPI `detail` alanı iki şekilde gelebilir:
 *  - string: doğrudan mesaj (custom exception'lar)
 *  - Array<{msg}>: Pydantic 422 validation hata listesi
 *
 * Bu helper her ikisini de tek bir okunabilir string'e indirger; aksi halde
 * UI'da `[object Object]` görünür ve toast/setState tip hatası oluşur.
 */

type ValidationDetailItem = { msg?: string };

export function getErrorMessage(
  error: unknown,
  fallback = "Bir hata oluştu. Lütfen tekrar deneyin.",
): string {
  const detail = (
    error as { response?: { data?: { detail?: unknown } } } | undefined
  )?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = (detail as ValidationDetailItem[])
      .map((item) => item?.msg)
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  return fallback;
}
