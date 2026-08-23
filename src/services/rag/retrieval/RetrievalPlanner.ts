import { QueryAnalysis , RAGConfiguration , RetrievalMode, RetrievalPlan , UseCaseProfile } from "../types";



export class RetrievalPlanner{


    /**
   * Generates a RetrievalPlan based on config overrides or UseCaseProfile defaults.
   */

    plan(analysis:QueryAnalysis , config:RAGConfiguration):RetrievalPlan{
            const profile=config.useCaseProfile;

            // 1. Resolve Retrieval Strategies (Profile Defaults vs overrides)
            let strategies=[config.retrieval.mode];

            // If configuration mode is Simple, or if the retrieval mode is explicitly set to 'adaptive'
            if(config.mode ==='simple'|| config.retrieval.mode === 'adaptive'){
                // In Simple/Auto Mode, we automatically configure the best strategies by use case profile
                strategies = this.getAdaptiveStrategies( analysis, profile);
            }

            
        // 2. Resolve parameters based on configuration mode
        const topK=config.retrieval.topK;
        const vectorWeight=config.retrieval.vectorWeight;
        const keywordWeight=config.retrieval.keywordWeight;
        const minScore=config.retrieval.minScore;

        return {
            strategies ,
            topK, 
            vectorWeight,
            metadataFilters:analysis.filters ,
            keywordWeight , 
            minScore
        };
    }

    /**
   * Adaptive Planning: Dynamically decides retrieval strategies based on query analysis and use case profile.
   */

    private getAdaptiveStrategies(analysis:QueryAnalysis , profile:UseCaseProfile):RetrievalMode[]{

         // 1. If the user is asking for an exact ID or error code, Keyword (or Hybrid) is mandatory
        if(analysis.intent === 'EXACT_LOOKUP'){
            return ['hybrid'];
        }
        switch (profile){
            case 'TECHNICAL_DOCUMENTATION':
                return ['hybrid']; // Tech documentation relies heavily on terms + meanings
            case 'COMPANY_POLICY':
                 return ['hybrid']; // Policies often contain metadata scopes & exact terms
            case 'DATABASE_KNOWLEDGE':
                // Database schemas require structured/keyword lookup -> Keyword/Hybrid
                return ['keyword'];
            case 'GENERAL_QA':
            default:
                return ['vector']; // General queries default to dense vectors   
        }
    }
}