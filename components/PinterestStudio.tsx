
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  PinterestResearch,
  PinterestContentIdea,
  PinterestPin,
  PinterestBoard,
  IdeaList,
  PinterestStudioConfig,
  PinContentType,
} from '../types';
import {
  researchPinterestNiche,
  generateContentIdeas,
  generatePinCopy,
  generateInfographicContent,
  generateIdeaListContent,
} from '../services/claude';
import {
  getPinterestBoards,
  getPinterestUserInfo,
  publishPin,
  publishIdeaPin,
  buildPinterestAuthUrl,
  exchangePinterestCode,
  refreshPinterestToken,
} from '../services/pinterest';
import { buildAffiliateSearchUrl } from '../services/amazon';
import { generatePinterestImage, generateInfographicImage } from '../services/gemini';
import { savePinterestStudioState, getPinterestStudioState } from '../services/storage';

const PINTEREST_CLIENT_ID = (process.env.PINTEREST_CLIENT_ID as string) || '';
const OAUTH_STATE_KEY = 'pinterest_oauth_state';

type StudioStep = 'research' | 'ideas' | 'create' | 'publish';

const STEP_ORDER: StudioStep[] = ['research', 'ideas', 'create', 'publish'];
const STEP_LABELS: Record<StudioStep, string> = {
  research: 'Research',
  ideas: 'Ideas',
  create: 'Create',
  publish: 'Publish',
};
const STEP_ICONS: Record<StudioStep, string> = {
  research: '🔍',
  ideas: '💡',
  create: '🎨',
  publish: '📌',
};

interface Props {
  isDarkMode: boolean;
}

const DEFAULT_CONFIG: PinterestStudioConfig = {
  pinterestAccessToken: '',
  amazonAffiliateTag: '',
  claudeApiKey: '',
  defaultBoardId: '',
};

const PinterestStudio: React.FC<Props> = ({ isDarkMode }) => {
  const bg = isDarkMode ? 'bg-dark-900' : 'bg-light-50';
  const card = isDarkMode ? 'bg-dark-800' : 'bg-white';
  const border = isDarkMode ? 'border-white/5' : 'border-gray-200';
  const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full px-4 py-3 rounded-xl border ${border} ${card} ${text} text-sm focus:outline-none focus:ring-2 focus:ring-[#e60023]/40`;

  const [step, setStep] = useState<StudioStep>('research');
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<PinterestStudioConfig>(DEFAULT_CONFIG);
  const [niched, setNiched] = useState('luxury skincare');
  const [ideaCount, setIdeaCount] = useState(6);
  const [research, setResearch] = useState<PinterestResearch | null>(null);
  const [ideas, setIdeas] = useState<PinterestContentIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<PinterestContentIdea | null>(null);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [drafts, setDrafts] = useState<PinterestPin[]>([]);
  const [ideaLists, setIdeaLists] = useState<IdeaList[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [pinSchedules, setPinSchedules] = useState<Record<string, string>>({});
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [bulkSchedule, setBulkSchedule] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeIdeaTab, setActiveIdeaTab] = useState<PinContentType>('collage');
  const [ideaListTopic, setIdeaListTopic] = useState('');
  const hydrated = useRef(false);

  // Load saved Studio state (settings, research, drafts, idea lists) on mount,
  // then handle a Pinterest OAuth redirect back to this page, if present.
  useEffect(() => {
    (async () => {
      const saved = await getPinterestStudioState();
      let nextConfig = saved?.config ?? DEFAULT_CONFIG;
      if (saved) {
        setNiched(saved.niche);
        setIdeaCount(saved.ideaCount);
        setResearch(saved.research);
        setIdeas(saved.ideas);
        setDrafts(saved.drafts);
        setIdeaLists(saved.ideaLists);
        setPinSchedules(saved.pinSchedules);
        setScheduleMode(saved.scheduleMode);
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code && state) {
        const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        window.history.replaceState({}, '', window.location.pathname);

        if (state === expectedState) {
          try {
            const redirectUri = `${window.location.origin}${window.location.pathname}`;
            const token = await exchangePinterestCode(code, redirectUri);
            nextConfig = {
              ...nextConfig,
              pinterestAccessToken: token.accessToken,
              pinterestRefreshToken: token.refreshToken ?? nextConfig.pinterestRefreshToken,
              pinterestTokenExpiresAt: token.expiresAt,
            };
            const userInfo = await getPinterestUserInfo(token.accessToken).catch(() => null);
            if (userInfo) nextConfig = { ...nextConfig, pinterestUsername: userInfo.username };
            setShowSettings(true);
          } catch (e: any) {
            setError(`Pinterest connection failed: ${e.message}`);
          }
        } else {
          setError('Pinterest connection failed: invalid OAuth state.');
        }
      }

      setConfig(nextConfig);
      hydrated.current = true;
    })();
  }, []);

  // Persist Studio state whenever it changes, so a refresh doesn't wipe
  // API keys, in-progress research, drafts, or scheduled pins.
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      savePinterestStudioState({
        id: 'default',
        config,
        niche: niched,
        ideaCount,
        research,
        ideas,
        drafts,
        ideaLists,
        pinSchedules,
        scheduleMode,
        updatedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [config, niched, ideaCount, research, ideas, drafts, ideaLists, pinSchedules, scheduleMode]);

  const withLoading = async <T,>(msg: string, fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setLoadingMsg(msg);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      return null;
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleResearch = async () => {
    if (!config.claudeApiKey) { setError('Add your Claude API key in Settings first.'); return; }
    const result = await withLoading(`Claude is researching "${niched}" on Pinterest...`, () =>
      researchPinterestNiche(niched, config.claudeApiKey)
    );
    if (result) { setResearch(result); setStep('ideas'); }
  };

  const handleGenerateIdeas = async () => {
    if (!research) return;
    const result = await withLoading('Generating Pinterest content ideas with Claude...', () =>
      generateContentIdeas(research, ideaCount, config.claudeApiKey)
    );
    if (result) setIdeas(result);
  };

  const handleCreatePin = async (idea: PinterestContentIdea) => {
    if (!config.claudeApiKey) { setError('Add your Claude API key in Settings.'); return; }

    setSelectedIdea(idea);
    setStep('create');

    const affiliateLink = config.amazonAffiliateTag
      ? buildAffiliateSearchUrl(idea.affiliateKeyword, config.amazonAffiliateTag)
      : '';

    if (idea.contentType === 'idea-list') {
      await withLoading('Building your Idea List with Claude...', async () => {
        const listData = await generateIdeaListContent(research!, idea.title, config.claudeApiKey);
        const newList: IdeaList = {
          id: `list_${Date.now()}`,
          title: listData.title,
          description: listData.description,
          pages: listData.pages.map((p, i) => ({ ...p, order: i })),
          boardId: config.defaultBoardId,
          status: 'draft',
          createdAt: Date.now(),
        };

        // Generate images for each page
        const pagesWithImages = await Promise.all(
          newList.pages.map(async (page: any) => {
            try {
              const imageUrl = await generatePinterestImage(page.imagePrompt, '2:3');
              return { ...page, imageUrl };
            } catch {
              return page;
            }
          })
        );
        newList.pages = pagesWithImages;
        setIdeaLists(prev => [newList, ...prev]);
      });
      return;
    }

    await withLoading('Creating pin with Claude copy + Gemini image...', async () => {
      const [copy, imageUrl] = await Promise.all([
        generatePinCopy(idea, config.amazonAffiliateTag, config.claudeApiKey),
        idea.contentType === 'infographic'
          ? generateInfographicContent(idea, config.claudeApiKey).then(generateInfographicImage)
          : generatePinterestImage(idea.imagePrompt, '2:3'),
      ]);

      const pin: PinterestPin = {
        id: `pin_${Date.now()}`,
        title: copy.title,
        description: copy.description,
        imageUrl,
        affiliateLink,
        boardId: config.defaultBoardId,
        hashtags: copy.hashtags,
        contentType: idea.contentType,
        status: 'draft',
        createdAt: Date.now(),
        ideaId: idea.id,
      };
      setDrafts(prev => [pin, ...prev]);
    });
  };

  // Pinterest access tokens expire (30 days); refresh proactively if we're
  // holding a refresh token and the current one is stale or about to be.
  const ensureFreshPinterestToken = async (): Promise<string> => {
    const { pinterestAccessToken, pinterestRefreshToken, pinterestTokenExpiresAt } = config;
    if (!pinterestAccessToken) throw new Error('Connect your Pinterest account in Settings first.');

    const expiringSoon = pinterestTokenExpiresAt !== undefined && pinterestTokenExpiresAt - Date.now() < 5 * 60 * 1000;
    if (expiringSoon && pinterestRefreshToken) {
      const refreshed = await refreshPinterestToken(pinterestRefreshToken);
      setConfig(c => ({
        ...c,
        pinterestAccessToken: refreshed.accessToken,
        pinterestRefreshToken: refreshed.refreshToken ?? c.pinterestRefreshToken,
        pinterestTokenExpiresAt: refreshed.expiresAt,
      }));
      return refreshed.accessToken;
    }
    return pinterestAccessToken;
  };

  const handleConnectPinterest = () => {
    if (!PINTEREST_CLIENT_ID) {
      setError('Pinterest OAuth is not configured. Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET (see README).');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.location.href = buildPinterestAuthUrl(PINTEREST_CLIENT_ID, redirectUri, state);
  };

  const handleDisconnectPinterest = () => {
    setConfig(c => ({
      ...c,
      pinterestAccessToken: '',
      pinterestRefreshToken: undefined,
      pinterestTokenExpiresAt: undefined,
      pinterestUsername: undefined,
    }));
    setBoards([]);
  };

  const handleLoadBoards = async () => {
    if (!config.pinterestAccessToken) { setError('Connect your Pinterest account in Settings first.'); return; }
    const result = await withLoading('Loading your Pinterest boards...', async () => {
      const token = await ensureFreshPinterestToken();
      return getPinterestBoards(token);
    });
    if (result) setBoards(result);
  };

  const handlePublishSelected = async () => {
    const toPublish = drafts.filter(d => selectedDraftIds.has(d.id) && d.status === 'draft');
    if (!toPublish.length) { setError('Select at least one draft pin to publish.'); return; }
    if (!config.pinterestAccessToken) { setError('Connect your Pinterest account in Settings first.'); return; }

    let accessToken: string;
    try {
      accessToken = await ensureFreshPinterestToken();
    } catch (e: any) {
      setError(e.message || 'Failed to refresh Pinterest connection.');
      return;
    }

    for (const pin of toPublish) {
      const scheduleStr = pinSchedules[pin.id];
      const scheduledAt = scheduleMode === 'schedule' && scheduleStr
        ? new Date(scheduleStr).getTime()
        : undefined;

      if (scheduleMode === 'schedule' && !scheduleStr) {
        setError(`Set a schedule time for "${pin.title}" before scheduling.`);
        return;
      }
      if (scheduledAt && scheduledAt < Date.now() + 5 * 60 * 1000) {
        setError(`Schedule time for "${pin.title}" must be at least 5 minutes in the future.`);
        return;
      }

      setDrafts(prev => prev.map(d => d.id === pin.id ? { ...d, status: 'publishing' } : d));
      try {
        const pinWithSchedule = {
          ...pin,
          boardId: pin.boardId || config.defaultBoardId,
          scheduledAt,
        };
        const pinId = await publishPin(pinWithSchedule, accessToken);
        setDrafts(prev => prev.map(d =>
          d.id === pin.id
            ? { ...d, status: scheduledAt ? 'scheduled' : 'published', pinterestPinId: pinId, scheduledAt }
            : d
        ));
      } catch (e: any) {
        setDrafts(prev => prev.map(d => d.id === pin.id ? { ...d, status: 'error' } : d));
        setError(`Failed: "${pin.title}": ${e.message}`);
      }
    }
  };

  const applyBulkSchedule = () => {
    if (!bulkSchedule) return;
    const next: Record<string, string> = { ...pinSchedules };
    selectedDraftIds.forEach(id => { next[id] = bulkSchedule; });
    setPinSchedules(next);
  };

  const minDateTime = () => {
    const d = new Date(Date.now() + 6 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const formatScheduled = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const handlePublishIdeaList = async (list: IdeaList) => {
    if (!config.pinterestAccessToken) { setError('Connect your Pinterest account in Settings first.'); return; }
    setIdeaLists(prev => prev.map(l => l.id === list.id ? { ...l, status: 'published' as const } : l));
    try {
      const accessToken = await ensureFreshPinterestToken();
      await publishIdeaPin({ ...list, boardId: list.boardId || config.defaultBoardId }, accessToken);
    } catch (e: any) {
      setIdeaLists(prev => prev.map(l => l.id === list.id ? { ...l, status: 'draft' as const } : l));
      setError(`Failed to publish Idea List: ${e.message}`);
    }
  };

  const toggleDraftSelect = (id: string) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentStepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className={`min-h-screen ${bg} ${text} pb-20`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl ${isDarkMode ? 'bg-dark-900/90' : 'bg-white/90'} border-b ${border} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e60023' }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Pinterest Studio</h1>
              <p className={`text-xs ${sub}`}>Powered by Claude + Gemini</p>
            </div>
          </div>

          {/* Step navigation */}
          <div className="hidden md:flex items-center gap-1">
            {STEP_ORDER.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  step === s
                    ? 'text-white shadow-md'
                    : `${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
                }`}
                style={step === s ? { background: '#e60023' } : {}}
              >
                <span>{STEP_ICONS[s]}</span>
                <span>{STEP_LABELS[s]}</span>
                {i < STEP_ORDER.length - 1 && step !== s && (
                  <svg className="w-3 h-3 ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSettings(s => !s)}
            className={`p-2.5 rounded-xl border ${border} transition-all ${showSettings ? 'bg-[#e60023] text-white border-[#e60023]' : `${card} hover:border-[#e60023]`}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Mobile step bar */}
        <div className={`md:hidden flex border-t ${border}`}>
          {STEP_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 py-2 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                step === s ? 'text-[#e60023]' : sub
              }`}
            >
              <span>{STEP_ICONS[s]}</span>
              <span>{STEP_LABELS[s]}</span>
              {step === s && <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: '#e60023' }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Settings Panel */}
        {showSettings && (
          <div className={`mb-8 ${card} rounded-2xl border ${border} p-6 shadow-xl`}>
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
              <span>⚙️</span> Studio Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Claude API Key</label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={config.claudeApiKey}
                  onChange={e => setConfig(c => ({ ...c, claudeApiKey: e.target.value }))}
                  className={inputCls}
                />
                <p className={`text-xs mt-1 ${sub}`}>Used for research + content generation</p>
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Pinterest Account</label>
                {config.pinterestAccessToken ? (
                  <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${border}`} style={{ background: 'rgba(34,197,94,0.08)' }}>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      ✓ Connected{config.pinterestUsername ? ` as @${config.pinterestUsername}` : ''}
                    </span>
                    <button
                      onClick={handleDisconnectPinterest}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${border} hover:border-red-400 hover:text-red-500 transition-all`}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleConnectPinterest}
                      className="w-full py-3 rounded-xl font-bold text-white shadow transition-all disabled:opacity-50"
                      style={{ background: '#e60023' }}
                    >
                      📌 Connect Pinterest
                    </button>
                    {!PINTEREST_CLIENT_ID && (
                      <p className={`text-xs ${sub}`}>Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET to enable one-click connect (see README). Paste a token manually below in the meantime.</p>
                    )}
                    <details>
                      <summary className={`text-xs cursor-pointer ${sub}`}>Or paste an access token manually</summary>
                      <input
                        type="password"
                        placeholder="Your Pinterest access token"
                        value={config.pinterestAccessToken}
                        onChange={e => setConfig(c => ({ ...c, pinterestAccessToken: e.target.value }))}
                        className={`${inputCls} mt-2`}
                      />
                    </details>
                  </div>
                )}
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Amazon Affiliate Tag</label>
                <input
                  type="text"
                  placeholder="yourtag-20"
                  value={config.amazonAffiliateTag}
                  onChange={e => setConfig(c => ({ ...c, amazonAffiliateTag: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Default Pinterest Board ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Board ID"
                    value={config.defaultBoardId}
                    onChange={e => setConfig(c => ({ ...c, defaultBoardId: e.target.value }))}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={handleLoadBoards}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border ${border} ${card} hover:border-[#e60023] transition-all`}
                  >
                    Load Boards
                  </button>
                </div>
                {boards.length > 0 && (
                  <select
                    className={`${inputCls} mt-2`}
                    onChange={e => setConfig(c => ({ ...c, defaultBoardId: e.target.value }))}
                    value={config.defaultBoardId}
                  >
                    <option value="">Select a board...</option>
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.pinCount} pins)</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 px-5 py-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className={`mb-6 px-5 py-4 rounded-xl border ${border} ${card} flex items-center gap-4`}>
            <div className="w-5 h-5 rounded-full border-2 border-[#e60023] border-t-transparent animate-spin flex-shrink-0" />
            <p className={`text-sm ${sub}`}>{loadingMsg}</p>
          </div>
        )}

        {/* ── RESEARCH STEP ─────────────────────────────────────────── */}
        {step === 'research' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Product Research</h2>
              <p className={`${sub} text-sm`}>Claude analyzes your niche and identifies what's performing on Pinterest in the Amazon space.</p>
            </div>

            <div className={`${card} rounded-2xl border ${border} p-6 shadow-lg`}>
              <div className="flex gap-3 flex-col sm:flex-row">
                <div className="flex-1">
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Niche / Category</label>
                  <input
                    value={niched}
                    onChange={e => setNiched(e.target.value)}
                    placeholder="e.g. luxury skincare, kitchen gadgets, home organization..."
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleResearch}
                    disabled={loading || !niched.trim()}
                    className="px-8 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#e60023' }}
                  >
                    Research with Claude ✨
                  </button>
                </div>
              </div>
            </div>

            {research && (
              <div className="space-y-6">
                {/* Top Products */}
                <div className={`${card} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
                  <div className="px-6 py-4 border-b" style={{ borderColor: '#e60023', borderBottomWidth: 2 }}>
                    <h3 className="font-bold text-lg">Top Performing Products</h3>
                    <p className={`text-xs ${sub} mt-0.5`}>Products with highest Pinterest engagement in the {research.niche} niche</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}>
                    {research.topProducts.map((product, i) => (
                      <div key={i} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: '#e60023' }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold">{product.productName}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${border} ${sub}`}>{product.category}</span>
                          </div>
                          <p className={`text-sm ${sub} mb-2`}>{product.pinterestAngle}</p>
                          <div className="flex flex-wrap gap-1">
                            {product.keyBenefits.map((b, j) => (
                              <span key={j} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(230,0,35,0.08)', color: '#e60023' }}>{b}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs font-semibold ${sub} mb-1`}>Audience</p>
                          <p className={`text-xs ${sub}`}>{product.targetAudience}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords + Angles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${card} rounded-2xl border ${border} p-5 shadow-lg md:col-span-1`}>
                    <h3 className="font-bold mb-3 flex items-center gap-2"><span>🔑</span> Trending Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {research.trendingKeywords.map((kw, i) => (
                        <span key={i} className={`text-xs px-3 py-1.5 rounded-full border ${border} font-medium`}>{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className={`${card} rounded-2xl border ${border} p-5 shadow-lg md:col-span-1`}>
                    <h3 className="font-bold mb-3 flex items-center gap-2"><span>📐</span> Content Angles</h3>
                    <ul className="space-y-2">
                      {research.contentAngles.map((angle, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm ${sub}`}>
                          <span className="text-[#e60023] mt-0.5 flex-shrink-0">▸</span> {angle}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${card} rounded-2xl border ${border} p-5 shadow-lg md:col-span-1`}>
                    <h3 className="font-bold mb-3 flex items-center gap-2"><span>📅</span> Seasonal Trends</h3>
                    <ul className="space-y-2">
                      {research.seasonalTrends.map((t, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm ${sub}`}>
                          <span className="text-[#e60023] mt-0.5 flex-shrink-0">▸</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Competitor Insights */}
                <div className={`${card} rounded-2xl border ${border} p-5 shadow-lg`}>
                  <h3 className="font-bold mb-2 flex items-center gap-2"><span>👁️</span> Competitor Insights</h3>
                  <p className={`text-sm ${sub} leading-relaxed`}>{research.competitorInsights}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep('ideas')}
                    className="px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
                    style={{ background: '#e60023' }}
                  >
                    Generate Ideas →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IDEAS STEP ────────────────────────────────────────────── */}
        {step === 'ideas' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Content Ideas</h2>
                <p className={`${sub} text-sm`}>Claude generates Pinterest-optimized content ideas across all pin formats.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={ideaCount}
                  onChange={e => setIdeaCount(Number(e.target.value))}
                  className={`${inputCls} w-28`}
                >
                  {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} ideas</option>)}
                </select>
                <button
                  onClick={handleGenerateIdeas}
                  disabled={loading || !research}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 transition-all"
                  style={{ background: '#e60023' }}
                >
                  {ideas.length ? 'Regenerate' : 'Generate Ideas ✨'}
                </button>
              </div>
            </div>

            {/* Idea List Topic */}
            {research && (
              <div className={`${card} rounded-2xl border ${border} p-5 shadow-sm flex gap-3 items-end`}>
                <div className="flex-1">
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Idea List Topic (optional)</label>
                  <input
                    value={ideaListTopic}
                    onChange={e => setIdeaListTopic(e.target.value)}
                    placeholder="e.g. 5 Morning Skincare Essentials Under $50"
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!ideaListTopic.trim() || !research) return;
                    const idea: PinterestContentIdea = {
                      id: `idea_il_${Date.now()}`,
                      title: ideaListTopic,
                      description: '',
                      hashtags: [],
                      contentType: 'idea-list',
                      productFocus: research.topProducts[0]?.productName || research.niche,
                      affiliateKeyword: research.trendingKeywords[0] || research.niche,
                      visualConcept: 'Multi-page idea list',
                      imagePrompt: `Pinterest lifestyle photography for ${ideaListTopic}`,
                    };
                    await handleCreatePin(idea);
                  }}
                  disabled={loading || !ideaListTopic.trim() || !research}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 transition-all whitespace-nowrap"
                  style={{ background: '#e60023' }}
                >
                  Build Idea List 📚
                </button>
              </div>
            )}

            {/* Content type filter tabs */}
            {ideas.length > 0 && (
              <div className={`flex gap-1 p-1 rounded-xl border ${border} ${card} w-fit`}>
                {(['all', 'collage', 'infographic', 'lifestyle', 'idea-list'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveIdeaTab(t as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      activeIdeaTab === t ? 'text-white shadow' : `${sub}`
                    }`}
                    style={activeIdeaTab === t ? { background: '#e60023' } : {}}
                  >
                    {t === 'all' ? 'All' : t}
                  </button>
                ))}
              </div>
            )}

            {/* Ideas grid */}
            {ideas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {ideas
                  .filter(idea => (activeIdeaTab as string) === 'all' || idea.contentType === activeIdeaTab)
                  .map(idea => (
                    <div key={idea.id} className={`${card} rounded-2xl border ${border} overflow-hidden shadow-lg hover:shadow-xl transition-all group`}>
                      <div className="h-2 w-full" style={{ background: '#e60023' }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize`}
                            style={{ background: 'rgba(230,0,35,0.1)', color: '#e60023' }}>
                            {idea.contentType}
                          </span>
                          <span className={`text-xs ${sub} font-medium`}>{idea.productFocus}</span>
                        </div>
                        <h3 className="font-bold text-sm leading-snug mb-2 line-clamp-2">{idea.title}</h3>
                        <p className={`text-xs ${sub} leading-relaxed mb-3 line-clamp-3`}>{idea.description}</p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {idea.hashtags.slice(0, 4).map((h, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${border} ${sub}`}>#{h}</span>
                          ))}
                        </div>
                        <p className={`text-xs italic ${sub} mb-4 line-clamp-2`}>{idea.visualConcept}</p>
                        <button
                          onClick={() => handleCreatePin(idea)}
                          disabled={loading}
                          className="w-full py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:shadow-md disabled:opacity-50"
                          style={{ background: '#e60023' }}
                        >
                          {idea.contentType === 'idea-list' ? '📚 Build Idea List' : '🎨 Create Pin'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {ideas.length === 0 && !loading && (
              <div className={`text-center py-20 ${card} rounded-2xl border ${border}`}>
                <div className="text-5xl mb-4">💡</div>
                <h3 className="font-bold text-lg mb-2">No ideas yet</h3>
                <p className={`${sub} text-sm`}>Click "Generate Ideas" to have Claude create Pinterest content ideas{research ? ` for the ${research.niche} niche` : ''}.</p>
              </div>
            )}

            {/* Idea Lists */}
            {ideaLists.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-4">Idea Lists</h3>
                <div className="space-y-4">
                  {ideaLists.map(list => (
                    <div key={list.id} className={`${card} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{list.title}</h4>
                            <p className={`text-sm ${sub} mb-3`}>{list.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {list.pages.map((page, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  {page.imageUrl && (
                                    <img src={page.imageUrl} alt={page.title} className="w-12 h-12 rounded-lg object-cover" />
                                  )}
                                  <div>
                                    <p className="text-xs font-semibold">{page.title}</p>
                                    <p className={`text-xs ${sub}`}>{page.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handlePublishIdeaList(list)}
                            disabled={list.status === 'published' || !config.pinterestAccessToken}
                            className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow disabled:opacity-50 transition-all flex-shrink-0"
                            style={{ background: list.status === 'published' ? '#22c55e' : '#e60023' }}
                          >
                            {list.status === 'published' ? '✓ Published' : 'Publish to Pinterest'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE STEP ───────────────────────────────────────────── */}
        {step === 'create' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Pin Creator</h2>
                <p className={`${sub} text-sm`}>Pins generated with Gemini images + Claude copy are saved as drafts.</p>
              </div>
              <button
                onClick={() => setStep('publish')}
                disabled={drafts.length === 0}
                className="px-6 py-2.5 rounded-xl font-bold text-white shadow disabled:opacity-50 transition-all"
                style={{ background: '#e60023' }}
              >
                View Drafts ({drafts.length}) →
              </button>
            </div>

            {selectedIdea && !loading && (
              <div className={`${card} rounded-2xl border ${border} p-5 shadow-lg`}>
                <h3 className="font-semibold text-sm mb-1 text-[#e60023]">Currently Creating</h3>
                <h4 className="font-bold text-lg">{selectedIdea.title}</h4>
                <p className={`text-sm ${sub} mt-1`}>{selectedIdea.visualConcept}</p>
              </div>
            )}

            {/* Drafts grid */}
            {drafts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {drafts.map(pin => (
                  <div key={pin.id} className={`${card} rounded-2xl border ${border} overflow-hidden shadow-lg`}>
                    <div className="relative aspect-[2/3] bg-gray-100 dark:bg-dark-700">
                      {pin.imageUrl && (
                        <img src={pin.imageUrl} alt={pin.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          pin.status === 'published' ? 'bg-green-500 text-white' :
                          pin.status === 'error' ? 'bg-red-500 text-white' :
                          pin.status === 'publishing' ? 'bg-yellow-500 text-white' :
                          'bg-white/90 text-gray-700'
                        }`}>
                          {pin.status === 'published' ? '✓ Published' :
                           pin.status === 'error' ? '✗ Error' :
                           pin.status === 'publishing' ? '⟳ Publishing' :
                           'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-semibold capitalize" style={{ color: '#e60023' }}>{pin.contentType}</span>
                      <h4 className="font-bold text-sm mt-1 mb-1 line-clamp-2">{pin.title}</h4>
                      <p className={`text-xs ${sub} line-clamp-3 mb-2`}>{pin.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pin.hashtags.slice(0, 3).map((h, i) => (
                          <span key={i} className={`text-xs px-1.5 py-0.5 rounded border ${border} ${sub}`}>#{h}</span>
                        ))}
                      </div>
                      {pin.affiliateLink && (
                        <p className={`text-xs ${sub} truncate`}>🔗 {pin.affiliateLink}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = pin.imageUrl;
                            a.download = `pinterest-pin-${pin.id}.png`;
                            a.click();
                          }}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${border} transition-all hover:border-[#e60023]`}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => { setStep('publish'); toggleDraftSelect(pin.id); }}
                          disabled={pin.status === 'published'}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all"
                          style={{ background: '#e60023' }}
                        >
                          {pin.status === 'published' ? 'Published' : 'Publish →'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-20 ${card} rounded-2xl border ${border}`}>
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="font-bold text-lg mb-2">No pins created yet</h3>
                <p className={`${sub} text-sm mb-6`}>Go back to Ideas and click "Create Pin" on any idea card.</p>
                <button
                  onClick={() => setStep('ideas')}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow"
                  style={{ background: '#e60023' }}
                >
                  Browse Ideas →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PUBLISH STEP ──────────────────────────────────────────── */}
        {step === 'publish' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Publish to Pinterest</h2>
                <p className={`${sub} text-sm`}>Publish immediately or schedule pins to go live automatically — Pinterest handles the timer.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const draftIds = new Set(drafts.filter(d => d.status === 'draft').map(d => d.id));
                    setSelectedDraftIds(draftIds);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border ${border} transition-all hover:border-[#e60023]`}
                >
                  Select All
                </button>
                <button
                  onClick={handlePublishSelected}
                  disabled={loading || selectedDraftIds.size === 0 || !config.pinterestAccessToken}
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 transition-all whitespace-nowrap"
                  style={{ background: '#e60023' }}
                >
                  {scheduleMode === 'schedule' ? '⏰' : '📌'} {scheduleMode === 'schedule' ? 'Schedule' : 'Publish'} {selectedDraftIds.size > 0 ? `(${selectedDraftIds.size})` : ''}
                </button>
              </div>
            </div>

            {/* Publish mode toggle + controls */}
            <div className={`${card} rounded-2xl border ${border} p-5 shadow-sm space-y-4`}>
              {/* Mode toggle */}
              <div className="flex items-center gap-3">
                <p className={`text-sm font-semibold ${sub} mr-1`}>Mode:</p>
                <div className={`flex gap-1 p-1 rounded-xl border ${border} w-fit`}>
                  <button
                    onClick={() => setScheduleMode('now')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${scheduleMode === 'now' ? 'text-white shadow' : sub}`}
                    style={scheduleMode === 'now' ? { background: '#e60023' } : {}}
                  >
                    Publish Now
                  </button>
                  <button
                    onClick={() => setScheduleMode('schedule')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${scheduleMode === 'schedule' ? 'text-white shadow' : sub}`}
                    style={scheduleMode === 'schedule' ? { background: '#e60023' } : {}}
                  >
                    Schedule
                  </button>
                </div>
                {scheduleMode === 'now' && (
                  <p className={`text-xs ${sub}`}>Selected pins go live immediately.</p>
                )}
              </div>

              {/* Bulk scheduler — shown only in Schedule mode */}
              {scheduleMode === 'schedule' && (
                <div className={`rounded-xl border ${border} p-4 space-y-3`} style={{ background: isDarkMode ? 'rgba(230,0,35,0.06)' : 'rgba(230,0,35,0.04)' }}>
                  <p className="text-sm font-semibold" style={{ color: '#e60023' }}>Bulk schedule for selected pins</p>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${sub}`}>Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        min={minDateTime()}
                        value={bulkSchedule}
                        onChange={e => setBulkSchedule(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <button
                      onClick={applyBulkSchedule}
                      disabled={!bulkSchedule || selectedDraftIds.size === 0}
                      className="px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all whitespace-nowrap"
                      style={{ background: '#e60023' }}
                    >
                      Apply to Selected ({selectedDraftIds.size})
                    </button>
                  </div>
                  <p className={`text-xs ${sub}`}>
                    Or set a custom time per pin using the picker on each card below. Pinterest requires at least 5 minutes ahead.
                  </p>
                </div>
              )}

              {/* Board selector */}
              {boards.length > 0 && (
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${sub}`}>Target Board</label>
                  <select
                    className={inputCls}
                    value={config.defaultBoardId}
                    onChange={e => setConfig(c => ({ ...c, defaultBoardId: e.target.value }))}
                  >
                    <option value="">Select board...</option>
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.pinCount} pins)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!config.pinterestAccessToken && (
              <div className={`${card} rounded-2xl border border-yellow-200 dark:border-yellow-800/50 p-5 bg-yellow-50 dark:bg-yellow-950/20`}>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium flex items-center gap-2">
                  <span>⚠️</span> Connect your Pinterest account in Settings to publish or schedule pins.
                </p>
                <button onClick={() => setShowSettings(true)} className="mt-2 text-xs underline text-yellow-600 dark:text-yellow-400">
                  Open Settings
                </button>
              </div>
            )}

            {drafts.length === 0 ? (
              <div className={`text-center py-20 ${card} rounded-2xl border ${border}`}>
                <div className="text-5xl mb-4">📌</div>
                <h3 className="font-bold text-lg mb-2">No pins to publish</h3>
                <p className={`${sub} text-sm mb-6`}>Create pins from your content ideas first.</p>
                <button onClick={() => setStep('ideas')} className="px-6 py-3 rounded-xl font-bold text-white shadow" style={{ background: '#e60023' }}>
                  Go to Ideas →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {drafts.map(pin => {
                  const isDraft = pin.status === 'draft';
                  const isSelected = selectedDraftIds.has(pin.id);
                  const scheduleVal = pinSchedules[pin.id] ?? '';

                  return (
                    <div
                      key={pin.id}
                      className={`${card} rounded-2xl border overflow-hidden shadow-lg transition-all ${
                        isDraft ? 'cursor-pointer' : ''
                      } ${isSelected ? 'border-[#e60023] ring-2 ring-[#e60023]/30' : border}`}
                    >
                      {/* Image */}
                      <div
                        className="relative aspect-[2/3] bg-gray-100 dark:bg-dark-700"
                        onClick={() => isDraft && toggleDraftSelect(pin.id)}
                      >
                        {pin.imageUrl && (
                          <img src={pin.imageUrl} alt={pin.title} className="w-full h-full object-cover" />
                        )}
                        {/* Select checkbox */}
                        <div className="absolute top-3 left-3">
                          <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${isSelected ? 'bg-[#e60023]' : 'bg-white/80'}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        {/* Status badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            pin.status === 'published' ? 'bg-green-500 text-white' :
                            pin.status === 'scheduled' ? 'bg-blue-500 text-white' :
                            pin.status === 'error' ? 'bg-red-500 text-white' :
                            pin.status === 'publishing' ? 'bg-yellow-500 text-white' :
                            'bg-white/90 text-gray-700'
                          }`}>
                            {pin.status === 'published' ? '✓ Published' :
                             pin.status === 'scheduled' ? '⏰ Scheduled' :
                             pin.status === 'error' ? '✗ Error' :
                             pin.status === 'publishing' ? '⟳ Sending…' :
                             'Draft'}
                          </span>
                        </div>
                        {/* Scheduled time overlay */}
                        {pin.status === 'scheduled' && pin.scheduledAt && (
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-500/90 backdrop-blur-sm px-3 py-2">
                            <p className="text-white text-xs font-semibold text-center">
                              Goes live {formatScheduled(pin.scheduledAt)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-4 space-y-2">
                        <h4 className="font-bold text-sm line-clamp-2">{pin.title}</h4>
                        <p className={`text-xs ${sub} line-clamp-2`}>{pin.description}</p>
                        {pin.affiliateLink && (
                          <a
                            href={pin.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 hover:underline"
                            style={{ color: '#e60023' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Amazon affiliate link
                          </a>
                        )}

                        {/* Per-pin schedule picker — only in schedule mode and for drafts */}
                        {scheduleMode === 'schedule' && isDraft && (
                          <div className="pt-2 border-t" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${sub}`}>Schedule this pin</label>
                            <input
                              type="datetime-local"
                              min={minDateTime()}
                              value={scheduleVal}
                              onChange={e => setPinSchedules(prev => ({ ...prev, [pin.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className={`${inputCls} text-xs py-2`}
                            />
                            {scheduleVal && (
                              <p className="text-xs mt-1" style={{ color: '#e60023' }}>
                                ⏰ {formatScheduled(new Date(scheduleVal).getTime())}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary stats */}
            {drafts.length > 0 && (
              <div className={`${card} rounded-2xl border ${border} p-5 shadow-sm`}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                  {[
                    { label: 'Total', value: drafts.length, color: '' },
                    { label: 'Drafts', value: drafts.filter(d => d.status === 'draft').length, color: '' },
                    { label: 'Scheduled', value: drafts.filter(d => d.status === 'scheduled').length, color: '#3b82f6' },
                    { label: 'Published', value: drafts.filter(d => d.status === 'published').length, color: '#22c55e' },
                    { label: 'Selected', value: selectedDraftIds.size, color: '#e60023' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <p className="text-2xl font-bold" style={stat.color ? { color: stat.color } : {}}>{stat.value}</p>
                      <p className={`text-xs ${sub} mt-0.5`}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinterestStudio;
