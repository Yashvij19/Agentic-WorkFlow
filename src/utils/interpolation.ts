// src/utils/interpolation.ts

export function injectVariables(text: string, context: Record<string, any>): string {
  // We use a Regular Expression to find anything wrapped in double curly braces {{...}}
  return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    // path will be something like "node_1.output"
    const keys = path.trim().split('.');
    
    // We walk down the context object to find the data
    let value = context;
    for (const key of keys) {
      if (value === undefined || value === null) break;
      value = value[key];
    }

    // If we found a valid string or number, inject it! Otherwise, leave the placeholder alone.
    return (typeof value === 'string' || typeof value === 'number') 
      ? String(value) 
      : match;
  });
}