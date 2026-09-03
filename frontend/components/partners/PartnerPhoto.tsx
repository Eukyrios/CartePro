import Image from "next/image";
import type { Partner } from "@/components/data/partners";

/**
 * A partner's photograph with their name laid over the bottom of it, shared by
 * the catalogue and the Minister's selection.
 *
 * alt="" on purpose: the name sits over the image as real text, so describing
 * the picture would only repeat it. `unoptimized` because the placeholders are
 * SVG, which the image optimiser refuses without being opened up to arbitrary
 * remote SVG — real photography can drop the flag.
 */
export default function PartnerPhoto({
  partner,
  className = "aspect-[4/3]",
  nameClassName = "text-[17px]",
}: {
  partner: Partner;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={partner.photo}
        alt=""
        fill
        unoptimized
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {/* Scrim: white on the artwork alone is not a contrast anyone can rely
          on, whatever the photograph turns out to be. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
      />
      <h3
        className={`absolute inset-x-0 bottom-0 p-4 leading-[1.05] font-black tracking-[-0.03em] text-white ${nameClassName}`}
      >
        {partner.name}
      </h3>
    </div>
  );
}
