import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * Le sous-ensemble Markdown de Discord, rendu en éléments React.
 *
 * Écrit à la main plutôt qu'importé, pour deux raisons qui tiennent ensemble.
 * D'abord la surface : ce texte est saisi par un partenaire et lu par tout le
 * monde, donc le rendu ne doit à aucun moment fabriquer du HTML depuis une
 * chaîne. Ici il n'y a pas de `dangerouslySetInnerHTML` : chaque nœud est un
 * élément React, une balise que ce fichier a choisie, et le texte de l'auteur
 * n'arrive jamais qu'en contenu. Une bibliothèque de rendu Markdown fait le
 * même travail correctement, mais avec un `html: false` à ne pas oublier et
 * une chaîne de dépendances à suivre pour une page de présentation.
 *
 * Ensuite le périmètre : ce n'est pas CommonMark, c'est ce que les gens tapent
 * dans un salon de discussion — gras, italique, souligné, barré, code, liens,
 * listes, citations, titres. Les tableaux, les images et le HTML en ligne n'y
 * sont pas, et ne pas les accepter est un choix : une fiche de partenaire n'a
 * pas à pouvoir insérer une image distante ni un tableau dans la mise en page
 * de l'administration.
 *
 * Les liens ne sont admis qu'en `http`, `https`, `mailto` ou en chemin interne
 * commençant par `/`. Tout le reste — `javascript:` au premier chef — est
 * rendu comme du texte, pas comme un lien mort : l'auteur voit ce qu'il a
 * écrit, et personne ne clique dessus.
 */

/** Un lien est-il de ceux qu'on accepte de rendre cliquables ? */
function safeHref(href: string): string | null {
  const url = href.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url;
  // Interne, et pas un protocole déguisé : « /... » mais jamais « //ailleurs ».
  if (/^\/(?!\/)/.test(url)) return url;
  return null;
}

/** Un lien sortant s'ouvre ailleurs ; un chemin interne reste dans l'onglet. */
function Anchor({ href, children }: { href: string; children: ReactNode }) {
  const external = !href.startsWith("/");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-cp-accent hover:text-cp-fg underline underline-offset-4"
    >
      {children}
    </a>
  );
}

/**
 * Les marques en ligne, dans l'ordre où il faut les essayer.
 *
 * L'ordre n'est pas cosmétique : `**` doit être tenté avant `*` et `__` avant
 * `_`, sinon « **gras** » se lit comme un italique vide suivi du mot. Le code
 * passe en premier et ne recurse pas — dans une portée `code`, les astérisques
 * sont des astérisques.
 */
const INLINE: ReadonlyArray<{
  pattern: RegExp;
  render: (match: RegExpExecArray, key: string) => ReactNode;
}> = [
  {
    pattern: /^`([^`\n]+)`/,
    render: (m, key) => (
      <code
        key={key}
        className="bg-cp-surface text-cp-fg px-1.5 py-0.5 font-mono text-[0.9em]"
      >
        {m[1]}
      </code>
    ),
  },
  {
    pattern: /^\*\*\*([\s\S]+?)\*\*\*/,
    render: (m, key) => (
      <strong key={key} className="font-black">
        <em>{inline(m[1], key)}</em>
      </strong>
    ),
  },
  {
    pattern: /^\*\*([\s\S]+?)\*\*/,
    render: (m, key) => (
      <strong key={key} className="font-black">
        {inline(m[1], key)}
      </strong>
    ),
  },
  {
    pattern: /^__([\s\S]+?)__/,
    render: (m, key) => (
      <span key={key} className="underline underline-offset-2">
        {inline(m[1], key)}
      </span>
    ),
  },
  {
    pattern: /^~~([\s\S]+?)~~/,
    render: (m, key) => <s key={key}>{inline(m[1], key)}</s>,
  },
  {
    pattern: /^\*([^*\n]+)\*/,
    render: (m, key) => <em key={key}>{inline(m[1], key)}</em>,
  },
  {
    pattern: /^_([^_\n]+)_/,
    render: (m, key) => <em key={key}>{inline(m[1], key)}</em>,
  },
  {
    // [texte](cible)
    pattern: /^\[([^\]\n]+)\]\(([^)\s]+)\)/,
    render: (m, key) => {
      const href = safeHref(m[2]);
      if (!href) return <span key={key}>{m[0]}</span>;
      return (
        <Anchor key={key} href={href}>
          {inline(m[1], key)}
        </Anchor>
      );
    },
  },
  {
    // Une adresse écrite nue. La ponctuation finale n'en fait pas partie.
    pattern: /^https?:\/\/[^\s<>]*[^\s<>.,;:!?)]/,
    render: (m, key) => (
      <Anchor key={key} href={m[0]}>
        {m[0].replace(/^https?:\/\//, "")}
      </Anchor>
    ),
  },
];

/**
 * Rend le contenu d'une ligne. Avance caractère par caractère, en essayant les
 * marques à chaque position : c'est plus lent qu'une grande alternation, et
 * bien plus facile à relire — le volume ici est un paragraphe, pas un livre.
 */
function inline(source: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) {
      out.push(plain);
      plain = "";
    }
  };

  while (i < source.length) {
    const rest = source.slice(i);
    const rule = INLINE.find((candidate) => candidate.pattern.test(rest));
    if (rule) {
      const match = rule.pattern.exec(rest);
      if (match) {
        flush();
        out.push(rule.render(match, `${keyPrefix}-${i}`));
        i += match[0].length;
        continue;
      }
    }
    plain += source[i];
    i += 1;
  }

  flush();
  return out;
}

const HEADINGS = {
  1: "text-cp-fg mt-6 mb-2 text-[21px] leading-[1.2] font-black tracking-[-0.03em]",
  2: "text-cp-fg mt-5 mb-2 text-[18px] leading-[1.25] font-black tracking-[-0.02em]",
  3: `text-cp-fg mt-5 mb-2 text-[15px] leading-[1.3] font-black`,
} as const;

/**
 * Découpe le texte en blocs et les rend.
 *
 * Un seul passage, ligne à ligne, avec deux états à retenir : le bloc de code
 * ouvert et la liste en cours. Les listes se regroupent — trois lignes en
 * « - » font un `<ul>` de trois `<li>` et non trois listes d'un élément.
 */
function blocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { lines: string[] } | null = null;

  const key = () => `b${out.length}`;

  function closeParagraph() {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    paragraph = [];
    out.push(
      <p key={key()} className="text-cp-fg mt-3 text-[16px] leading-[1.6]">
        {inline(text, key())}
      </p>,
    );
  }

  function closeList() {
    if (!list) return;
    const { ordered, items } = list;
    list = null;
    const Tag = ordered ? "ol" : "ul";
    out.push(
      <Tag
        key={key()}
        className={cx(
          "text-cp-fg mt-3 space-y-1.5 ps-5 text-[16px] leading-[1.6]",
          ordered ? "list-decimal" : "list-disc",
        )}
      >
        {items.map((item, index) => (
          <li key={index} className="marker:text-cp-accent">
            {inline(item, `${key()}-${index}`)}
          </li>
        ))}
      </Tag>,
    );
  }

  function closeQuote() {
    if (quote.length === 0) return;
    const text = quote.join(" ");
    quote = [];
    out.push(
      <blockquote
        key={key()}
        className="border-l-cp-accent text-cp-muted mt-3 border-l-2 ps-4 text-[16px] leading-[1.6] italic"
      >
        {inline(text, key())}
      </blockquote>,
    );
  }

  function closeCode() {
    if (!code) return;
    const { lines: body } = code;
    code = null;
    out.push(
      <pre
        key={key()}
        className="bg-cp-surface text-cp-fg mt-3 overflow-x-auto p-4 font-mono text-[13px] leading-[1.5]"
      >
        <code>{body.join("\n")}</code>
      </pre>,
    );
  }

  /** Tout fermer sauf ce qu'on vient d'ouvrir. */
  function closeAll() {
    closeParagraph();
    closeList();
    closeQuote();
  }

  for (const line of lines) {
    // Une clôture de bloc de code passe avant toute autre lecture.
    if (/^\s*```/.test(line)) {
      if (code) closeCode();
      else {
        closeAll();
        code = { lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }

    if (line.trim() === "") {
      closeAll();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeAll();
      const level = heading[1].length as 1 | 2 | 3;
      const Tag = `h${level + 2}` as "h3" | "h4" | "h5";
      out.push(
        <Tag key={key()} className={HEADINGS[level]}>
          {inline(heading[2], key())}
        </Tag>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      closeParagraph();
      closeQuote();
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      if (list && list.ordered === ordered) list.items.push(item);
      else {
        closeList();
        list = { ordered, items: [item] };
      }
      continue;
    }

    const quoted = /^\s*>\s?(.*)$/.exec(line);
    if (quoted) {
      closeParagraph();
      closeList();
      quote.push(quoted[1]);
      continue;
    }

    closeList();
    closeQuote();
    paragraph.push(line.trim());
  }

  closeCode();
  closeAll();
  return out;
}

/**
 * Rend un texte Markdown. Ne pose aucune marge extérieure : le premier bloc en
 * porte une (`mt-3`) que l'appelant peut absorber avec un `-mt-3` s'il veut
 * coller le texte à ce qui précède.
 */
export default function Markdown({
  children,
  className,
}: {
  /** Le texte source. Une chaîne vide ne rend rien du tout. */
  children: string;
  /** Additif seulement — ce composant possède la typographie de ses blocs. */
  className?: string;
}) {
  const rendered = children.trim() ? blocks(children) : [];
  if (rendered.length === 0) return null;
  return (
    <div className={cx("[&>*:first-child]:mt-0", className)}>{rendered}</div>
  );
}
