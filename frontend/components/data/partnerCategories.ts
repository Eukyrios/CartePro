/**
 * Partner categories, as data.
 *
 * The interface must not know these: a category can be added, renamed or
 * removed here — or served from the backend once it exists, by replacing the
 * body of `partnerCategories()` — without an interface line changing. Every
 * screen reads them through that function, and each is built to render an
 * empty list cleanly rather than assuming there is at least one.
 *
 * `id` is what a profile stores, `label` is what a screen shows, so renaming a
 * category leaves existing profiles pointing at it.
 */
export type PartnerCategory = {
  id: string;
  label: string;
};

const CATEGORIES: PartnerCategory[] = [
  { id: "restauration", label: "Restauration" },
  { id: "culture", label: "Culture" },
  { id: "loisirs", label: "Loisirs" },
  { id: "commerce", label: "Commerce" },
  { id: "hebergement", label: "Hébergement" },
  { id: "bien-etre", label: "Bien-être" },
  { id: "autre", label: "Autre" },
];

/** The categories a screen should offer. An empty list is a valid answer. */
export function partnerCategories(): readonly PartnerCategory[] {
  return CATEGORIES;
}

/**
 * The label to print for a stored value. Falls back to the stored string, so a
 * profile holding a category that has since been removed still reads sensibly
 * instead of rendering blank.
 */
export function partnerCategoryLabel(id: string): string {
  return CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
}
