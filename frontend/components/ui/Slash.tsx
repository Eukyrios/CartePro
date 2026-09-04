/**
 * The accent slash that separates two halves of a micro-type line.
 *
 * Always `aria-hidden`: it is punctuation drawn in colour, not a word. It was
 * written inline eight times without it and three times with it, so a screen
 * reader announced "slash" on some screens and skipped it on others for the
 * same device.
 */
export default function Slash() {
  return (
    <span aria-hidden="true" className="text-cp-accent px-1.5">
      /
    </span>
  );
}
