import { runSync } from "../lib/jobs/sync";

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const summary = await runSync(requested.length > 0 ? requested : undefined);

  console.table(
    summary.results.map((result) => ({
      fuente: result.source,
      obtenidas: result.fetched,
      nuevas: result.inserted,
      actualizadas: result.updated,
      error: result.error ?? "",
    })),
  );
  console.log(`Analizadas: ${summary.scored} · Descartadas por filtros: ${summary.excluded}`);

  if (summary.results.some((result) => result.error)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
