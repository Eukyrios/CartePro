"use client";

import { Table, TableBody, TableCell, TableRow } from "flowbite-react";
import { Arrow, Eyebrow, SectionRail } from "./Marks";

/**
 * Demo partners. The real network is administered from the backend; this list
 * mirrors the maquette so the section reads the same.
 */
const PARTNERS = [
  { id: "01", name: "Poney Dream 78", type: "Loisirs", place: "78" },
  { id: "02", name: "KostumParty", type: "Culture", place: "Paris" },
  {
    id: "03",
    name: "Glaces Artisanales Corrèze",
    type: "Restauration",
    place: "19",
  },
  { id: "04", name: "Chapelier Fontaine", type: "Culture", place: "Paris" },
] as const;

/**
 * "Le réseau". Same flat-row treatment as the steps: a Flowbite Table with the
 * type and place columns dropped on mobile, as the original does.
 */
export default function NetworkSection() {
  return (
    <section
      id="reseau"
      className="border-cp-border grid min-h-screen snap-start content-center gap-9 border-b px-6 py-16 lg:grid-cols-[100px_1fr] lg:gap-[65px] lg:px-[7vw] lg:py-[110px]"
    >
      <SectionRail index="02" name="LE RÉSEAU" />

      <div className="max-w-[1250px]">
        <div className="grid items-end gap-0 lg:grid-cols-[1.3fr_0.7fr] lg:gap-[70px]">
          <div>
            <Eyebrow>PARTENAIRES</Eyebrow>
            <h2 className="mt-[22px] mb-10 text-[clamp(55px,7vw,105px)] leading-[0.82] font-black tracking-[-0.08em] lg:mb-[45px]">
              Vos envies.
              <br />
              <em className="text-cp-accent font-serif font-normal">
                Votre réseau.
              </em>
            </h2>
          </div>
          <p className="mt-0 mb-10 max-w-[340px] text-sm leading-[1.55] lg:mb-[50px]">
            Un réseau évolutif, administré au fil du temps. Les catégories
            restent simples et lisibles.
          </p>
        </div>

        <Table
          theme={{ root: { shadow: "hidden" } }}
          className="border-cp-fg text-cp-fg border-t-2"
        >
          <TableBody>
            {PARTNERS.map((partner) => (
              <TableRow
                key={partner.id}
                className="border-cp-border group hover:text-cp-accent cursor-pointer border-b bg-transparent hover:bg-transparent"
              >
                <TableCell className="text-cp-accent w-[55px] px-0 py-[21px] text-[9px] font-black">
                  {partner.id}
                </TableCell>
                <TableCell className="py-[21px] pr-0 pl-[18px] text-base font-black tracking-[-0.025em]">
                  {partner.name}
                </TableCell>
                <TableCell className="hidden w-[138px] py-[21px] pr-0 pl-[18px] text-[9px] font-black text-[#777] lg:table-cell">
                  {partner.type}
                </TableCell>
                <TableCell className="hidden w-[108px] py-[21px] pr-0 pl-[18px] text-[9px] font-black text-[#777] lg:table-cell">
                  {partner.place}
                </TableCell>
                <TableCell className="w-[48px] px-0 py-[21px] text-right">
                  <Arrow className="ml-0" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <button
          type="button"
          className="group border-cp-fg mt-7 border-0 border-b bg-transparent pb-1.5 text-[10px] font-black"
        >
          Explorer le réseau
          <Arrow />
        </button>
      </div>
    </section>
  );
}
