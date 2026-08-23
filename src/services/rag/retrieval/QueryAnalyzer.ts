// src/services/rag/retrieval/QueryAnalyzer.ts 

import { QueryAnalysis } from "../types";
import { executeAiAgent } from '../../../utils/aiAgent';
import { prisma } from '../../../utils/db';

export class QueryAnalyzer{

     /**
   * Analyzes the query. Uses LLM-based analysis if a Gemini key is present,
   * otherwise falls back to fast rule-based analysis.
   */

  async analyze (orgId:string,query:string  , metadataFilters?:Record<string ,string>):Promise<QueryAnalysis>{

    const normalized=query.trim().toLowerCase();
    const keywords=this.extractKeywords(normalized);
    // Check if organization has a Gemini API key configured
    const credential = await prisma.credential.findFirst({
      where: {
        organizationId: orgId,
        name: 'GEMINI_API_KEY',
      },
    });

    if (credential && credential.encryptedData) {
      try {
        // Run intelligent LLM-based classification
        return await this.analyzeWithLLM(query, keywords, credential.encryptedData, metadataFilters);
      } catch (err) {
        console.warn('LLM Query Analysis failed, falling back to rule-based analysis:', err);
      }
    }

    const intent=this.classifyIntent(normalized , keywords);

    return {
        originalQuery:query,
        normalizedQuery:normalized ,
        intent,
        keywords,
        filters:metadataFilters ||{}
    };
  }

  private extractKeywords(query:string):string[]{
    // Remove punctuation and common stop words to keep only distinct keywords
    const clean = query.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    const words = clean.split(/\s+/);
    const stopwords = new Set([
      'what', 'why', 'how', 'who', 'where', 'which', 'is', 'are', 'the', 'a',
      'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'about', 'our', 'my'
    ]);

     return Array.from(new Set(words.filter(w => w.length > 2 && !stopwords.has(w))));

  }

 

  private classifyIntent(query:string , keywords:string[]):string {
    // Check for exact identifier lookup intent (e.g., error codes, API methods)
    // regesx expression js creat an object of regex and test is the method of reges in build that return true or false based on expression 
     const exactCodePattern = /[a-z0-9]+[-_][a-z0-9]+/i;
     const hasErrorCode=exactCodePattern.test(query);


      const summarySynonyms = ['summarize', 'summary', 'compare', 'difference', 'explain', 'overview', 'tldr', 'vs'];


     if(hasErrorCode || keywords.some(k=>k.includes('error')|| k.includes('code')||k.includes('auth_')||k.includes('err_'))){
        return 'EXACT_LOOKUP';
     }


    //  Check for summaries or long comparisons

   const wantsSummary = summarySynonyms.some(synonym => query.includes(synonym));

    if (wantsSummary) {
      return 'COMPARISON_OR_SUMMARY';
    }

    // Default to semantic retrieval
    return 'SEMANTIC_SEARCH';


  }

  /**
   * Prompts Gemini to analyze the query intent and structure as JSON
   */

   private async analyzeWithLLM(
    query: string,
    keywords: string[],
    encryptedKey: string,
    metadataFilters?: Record<string, string>
  ): Promise<QueryAnalysis> {


    const prompt = `
        Analyze the user's search query and classify its intent into one of these types:
        - EXACT_LOOKUP: Searching for exact error codes, ID strings, class names, or exact terms (e.g., "AUTH_4017", "RedisPort").
        - COMPARISON_OR_SUMMARY: Asking to summarize documents, make high-level reports, or compare multiple systems.
        - SEMANTIC_SEARCH: Conceptual questions about how something works, troubleshooting, or general info.
        Search Query: "${query}"
        Return ONLY a raw JSON block matching this typescript type structure (no markdown formatting, no backticks, no wrapping):
        {
        "intent": "EXACT_LOOKUP" | "COMPARISON_OR_SUMMARY" | "SEMANTIC_SEARCH",
        "keywords": ["word1", "word2"],
        "reason": "short explanation"
        }
        `;
    // executeAiAgent is our existing helper in src/utils/aiAgent.ts
    const aiResponse = await executeAiAgent({
      prompt,
      encryptedApiKey: encryptedKey,
    });

     try {
      const parsed = JSON.parse(aiResponse.output.trim().replace(/```json|```/g, ''));
      return {
        originalQuery: query,
        normalizedQuery: query.toLowerCase(),
        intent: parsed.intent || 'SEMANTIC_SEARCH',
        keywords: parsed.keywords || keywords,
        filters: metadataFilters || {},
      };
    } catch (err) {
      throw new Error(`Failed to parse LLM analysis response: ${aiResponse.output}`);
    }

  }
}