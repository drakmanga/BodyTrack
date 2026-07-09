export interface MetricCatalogEntry {
  name: string;
  unit: string;
  howToMeasure: string;
}

// Ported verbatim from com.bodytrack.metric.MetricCatalog — order matters,
// it becomes each seeded metric's displayOrder at registration.
export const METRIC_CATALOG: MetricCatalogEntry[] = [
  { name: "Peso", unit: "kg", howToMeasure: "Al mattino, a digiuno, dopo essere andato in bagno" },
  { name: "Collo", unit: "cm", howToMeasure: "Sotto il pomo d'Adamo" },
  { name: "Petto/Torace", unit: "cm", howToMeasure: "All'altezza dei capezzoli, respiro normale" },
  { name: "Bicipite sx", unit: "cm", howToMeasure: "Braccio rilassato, punto più largo" },
  { name: "Bicipite dx", unit: "cm", howToMeasure: "Braccio rilassato, punto più largo" },
  { name: "Avambraccio sx", unit: "cm", howToMeasure: "Punto più largo, braccio rilassato" },
  { name: "Avambraccio dx", unit: "cm", howToMeasure: "Punto più largo, braccio rilassato" },
  { name: "Vita", unit: "cm", howToMeasure: "Punto più stretto tra costole e fianchi" },
  { name: "Fianchi", unit: "cm", howToMeasure: "Punto più largo dei glutei" },
  { name: "Coscia sx", unit: "cm", howToMeasure: "Punto più largo, sotto il gluteo" },
  { name: "Coscia dx", unit: "cm", howToMeasure: "Punto più largo, sotto il gluteo" },
  { name: "Polpaccio sx", unit: "cm", howToMeasure: "Punto più largo" },
  { name: "Polpaccio dx", unit: "cm", howToMeasure: "Punto più largo" },
];
