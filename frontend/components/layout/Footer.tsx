/**
 * Bottom bar shown on every page, mounted once in the root layout. The
 * container matches TopBar's so its content lines up with the logo above it.
 *
 * TODO: the entries below are placeholders — fill in the real contact details
 * and point the legal links at the actual pages once they exist.
 */
const FOOTER_LINKS = [
  { label: "Contact", href: "#" },
  { label: "Conditions d'utilisation", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-primary-soft border-default mt-auto border-t">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-body text-sm">
          © {new Date().getFullYear()} Ticket Tout
        </p>

        <nav aria-label="Liens de bas de page">
          <ul className="text-body flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="hover:text-heading hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
