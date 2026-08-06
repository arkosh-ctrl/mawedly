import { jsonLdGraph } from "@/lib/seo/site";

/**
 * Renders one or more schema.org nodes as a single JSON-LD <script>.
 *
 * ONE script, not several. Emitting separate <script type="application/ld+json">
 * blocks gives a parser several unrelated fragments and leaves it to guess that
 * the article, its author and the publisher are connected. A single @graph with
 * @id references states the relationship outright.
 *
 * dangerouslySetInnerHTML is correct and necessary here: React escapes text
 * children, which would corrupt the JSON. The input is serialised from values
 * this app controls — never user content — and jsonLdGraph runs it through
 * JSON.stringify, so a quote or angle bracket in a merchant name cannot break
 * out of the script tag.
 */
export function JsonLd({ nodes }: { nodes: object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdGraph(...nodes) }}
    />
  );
}
