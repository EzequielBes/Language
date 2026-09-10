// "en-CA" formats as YYYY-MM-DD *and* uses the local calendar (unlike
// toISOString(), which is UTC) — switching this to toISOString().slice(0,10)
// would silently reintroduce the local/UTC date-boundary bug fixed in 1881934.
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA");
}
