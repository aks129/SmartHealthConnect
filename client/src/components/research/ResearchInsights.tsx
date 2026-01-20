/**
 * Research Insights Component
 *
 * Displays relevant research preprints from bioRxiv/medRxiv based on
 * patient conditions. Helps patients stay informed about latest research.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  ExternalLink,
  Calendar,
  Users,
  FileText,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Beaker,
  GraduationCap,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Condition } from '@shared/schema';
import { useConditionResearch, type PreprintArticle } from '@/hooks/use-external-apis';

interface ResearchInsightsProps {
  conditions?: Condition[];
}

// Map condition codes to readable names for research
const CONDITION_NAMES: Record<string, string> = {
  '38341003': 'hypertension',
  '44054006': 'diabetes',
  '73211009': 'diabetes',
  '195967001': 'asthma',
  '13645005': 'copd',
  '698754002': 'chronic kidney disease',
  '49601007': 'heart disease',
};

export function ResearchInsights({ conditions = [] }: ResearchInsightsProps) {
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Extract primary condition for research search
  const primaryCondition = useMemo(() => {
    if (conditions.length === 0) return '';

    const firstCondition = conditions[0];
    const code = firstCondition.code?.coding?.[0]?.code;
    if (code && CONDITION_NAMES[code]) {
      return CONDITION_NAMES[code];
    }

    return firstCondition.code?.text ||
           firstCondition.code?.coding?.[0]?.display ||
           '';
  }, [conditions]);

  // Get all condition names for tabs
  const conditionNames = useMemo(() => {
    const names: string[] = [];
    conditions.forEach(condition => {
      const code = condition.code?.coding?.[0]?.code;
      const name = code && CONDITION_NAMES[code]
        ? CONDITION_NAMES[code]
        : (condition.code?.text || condition.code?.coding?.[0]?.display || '');
      if (name && !names.includes(name.toLowerCase())) {
        names.push(name.toLowerCase());
      }
    });
    return names.slice(0, 4); // Max 4 conditions
  }, [conditions]);

  // Fetch research for primary condition
  const {
    data: researchData,
    isLoading,
    isError,
    refetch
  } = useConditionResearch(
    activeTab === 'all' ? primaryCondition : activeTab,
    'medrxiv',
    !!primaryCondition || activeTab !== 'all'
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateAbstract = (abstract: string, maxLength = 300) => {
    if (abstract.length <= maxLength) return abstract;
    return abstract.substring(0, maxLength).trim() + '...';
  };

  const articles = researchData?.articles || [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <CardTitle>Latest Research</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading
              </Badge>
            ) : articles.length > 0 ? (
              <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3 h-3" />
                medRxiv
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                No data
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          {primaryCondition
            ? `Recent preprint research related to ${primaryCondition}`
            : 'Add health conditions to see relevant research'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Condition tabs */}
        {conditionNames.length > 1 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              {conditionNames.map(name => (
                <TabsTrigger key={name} value={name} className="text-xs capitalize">
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
            <p>Searching medRxiv for research...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
            <p>Could not load research data</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}

        {/* No conditions */}
        {!primaryCondition && !isLoading && (
          <div className="py-8 text-center text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Add health conditions to your profile</p>
            <p className="text-sm">to see relevant research from medRxiv/bioRxiv</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isError && articles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{articles.length} recent preprints found</span>
              {researchData?.keywords && (
                <span className="text-xs">
                  Keywords: {researchData.keywords.slice(0, 3).join(', ')}
                </span>
              )}
            </div>

            {articles.map((article) => (
              <ArticleCard
                key={article.doi}
                article={article}
                isExpanded={expandedArticle === article.doi}
                onToggle={() => setExpandedArticle(
                  expandedArticle === article.doi ? null : article.doi
                )}
              />
            ))}

            {articles.length >= 10 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.medrxiv.org/search/${encodeURIComponent(primaryCondition)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View More on medRxiv
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* No results */}
        {!isLoading && !isError && primaryCondition && articles.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent preprints found for "{primaryCondition}"</p>
            <p className="text-sm mt-1">Try checking back later for new research</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Note:</strong> Preprints are preliminary research that have not yet been
              peer-reviewed. Always discuss any research findings with your healthcare provider
              before making medical decisions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Article card subcomponent
interface ArticleCardProps {
  article: PreprintArticle;
  isExpanded: boolean;
  onToggle: () => void;
}

function ArticleCard({ article, isExpanded, onToggle }: ArticleCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-secondary/30 transition-colors">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm leading-tight line-clamp-2">
                {article.title}
              </h4>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(article.date)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {article.authorList.length} authors
              </span>
              <Badge variant="secondary" className="text-xs">
                {article.category}
              </Badge>
              {article.published && article.published !== 'NA' && (
                <Badge variant="default" className="text-xs bg-emerald-500">
                  Published
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t bg-secondary/10">
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Authors</p>
              <p className="text-sm">
                {article.authorList.slice(0, 5).join(', ')}
                {article.authorList.length > 5 && ` +${article.authorList.length - 5} more`}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Abstract</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {article.abstract.length > 500
                  ? article.abstract.substring(0, 500) + '...'
                  : article.abstract}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-3 h-3 mr-2" />
                  Read Full Paper
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                DOI: {article.doi}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
