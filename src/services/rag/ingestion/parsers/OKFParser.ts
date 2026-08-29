// src/services/rag/ingestion/parsers/OKFParser.ts

export interface EntityRelation {
  sourceEntity: string;
  relationType: string;
  targetEntity: string;
  metadata?: Record<string, any>;
}

export interface OKFParsedDocument {
  title: string;
  entityName: string;
  entityType: string;
  frontmatter: Record<string, any>;
  relations: EntityRelation[];
  cleanContent: string;
  hasFrontmatter: boolean;
}

export class OKFParser {
  /**
   * Detects if content has YAML frontmatter (starts with ---)
   */
  hasYAMLFrontmatter(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('---') && trimmed.indexOf('---', 3) !== -1;
  }

  /**
   * Parses Open Knowledge Format (OKF) markdown documents.
   * Extracts YAML frontmatter, entity attributes, and directed relation edges.
   */
  parse(rawContent: string, defaultTitle: string = 'Untitled'): OKFParsedDocument {
    const trimmed = rawContent.trim();

    if (!this.hasYAMLFrontmatter(trimmed)) {
      return {
        title: defaultTitle,
        entityName: defaultTitle,
        entityType: 'document',
        frontmatter: {},
        relations: [],
        cleanContent: trimmed,
        hasFrontmatter: false,
      };
    }

    // Extract frontmatter block between first and second ---
    const secondDashIndex = trimmed.indexOf('---', 3);
    const yamlBlock = trimmed.slice(3, secondDashIndex).trim();
    const cleanContent = trimmed.slice(secondDashIndex + 3).trim();

    const frontmatter = this.parseSimpleYAML(yamlBlock);

    const entityName =
      frontmatter.name || frontmatter.title || frontmatter.entity || defaultTitle;
    const entityType = frontmatter.type || 'entity';

    // Extract directed relation edges from frontmatter
    const relations = this.extractRelations(entityName, frontmatter);

    return {
      title: entityName,
      entityName,
      entityType,
      frontmatter,
      relations,
      cleanContent,
      hasFrontmatter: true,
    };
  }

  /**
   * Lightweight, zero-dependency YAML parser for key-value pairs, lists, and arrays.
   */
  private parseSimpleYAML(yamlText: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yamlText.split('\n');

    let currentListKey: string | null = null;

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Check for array item under a key (- item)
      if (line.startsWith('- ') && currentListKey) {
        const itemVal = line.slice(2).trim().replace(/^["']|["']$/g, '');
        if (!Array.isArray(result[currentListKey])) {
          result[currentListKey] = [];
        }
        result[currentListKey].push(itemVal);
        continue;
      }

      // Check for key: value
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const rawVal = line.slice(colonIdx + 1).trim();

        if (!rawVal) {
          // Key followed by multiline list
          currentListKey = key;
          result[key] = [];
        } else {
          currentListKey = null;

          // Inline array: [item1, item2]
          if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            result[key] = rawVal
              .slice(1, -1)
              .split(',')
              .map((s) => s.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean);
          } else {
            // Primitive parsing: boolean, number, string
            let val: any = rawVal.replace(/^["']|["']$/g, '');
            if (val.toLowerCase() === 'true') val = true;
            else if (val.toLowerCase() === 'false') val = false;
            else if (!isNaN(Number(val)) && val !== '') val = Number(val);

            result[key] = val;
          }
        }
      }
    }

    return result;
  }

  /**
   * Extracts directed relation triples: (sourceEntity) -> [relationType] -> (targetEntity)
   */
  private extractRelations(
    sourceEntity: string,
    frontmatter: Record<string, any>
  ): EntityRelation[] {
    const relations: EntityRelation[] = [];

    // 1. Check explicit "relations" object (e.g. relations: { connects_to: ["db"], depends_on: ["auth"] })
    if (frontmatter.relations && typeof frontmatter.relations === 'object') {
      for (const [relType, targets] of Object.entries(frontmatter.relations)) {
        const targetList = Array.isArray(targets) ? targets : [targets];
        targetList.forEach((target) => {
          if (target && typeof target === 'string') {
            relations.push({
              sourceEntity,
              relationType: relType.toLowerCase(),
              targetEntity: target.trim(),
            });
          }
        });
      }
    }

    // 2. Check common standard relation keys: depends_on, connects_to, implements, owner, parent
    const standardKeys = [
      'depends_on',
      'connects_to',
      'calls_api',
      'uses_database',
      'implements',
      'part_of',
    ];

    for (const key of standardKeys) {
      if (frontmatter[key]) {
        const targets = Array.isArray(frontmatter[key])
          ? frontmatter[key]
          : [frontmatter[key]];

        targets.forEach((target: any) => {
          if (target && typeof target === 'string') {
            relations.push({
              sourceEntity,
              relationType: key,
              targetEntity: target.trim(),
            });
          }
        });
      }
    }

    return relations;
  }
}
