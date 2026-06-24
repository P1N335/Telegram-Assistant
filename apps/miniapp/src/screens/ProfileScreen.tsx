import { useCallback, useEffect, useState } from "react";
import type {
  AchievementDto,
  HomeResponse,
  LeaderboardEntryDto,
  PetCustomizationOptionDto,
  PetDto,
  PetSummaryDto,
  PremiumStatusDto,
  SkillDto,
  SkillTemplateDto,
} from "@tpc/shared";
import { PET_NAME_MAX_LENGTH, PremiumFeature } from "@tpc/shared";
import { api, ApiError } from "../api/client.js";
import { Card, Chip, ProgressBar } from "../components/ui.js";
import { PetCard } from "../components/PetCard.js";
import { PremiumGate } from "../components/PremiumGate.js";
import { hasFeature } from "../lib/premium.js";
import { getTelegramPhotoUrl } from "../lib/telegram.js";
import { useI18n } from "../i18n/index.js";

export function ProfileScreen({ data, onChanged }: { data: HomeResponse; onChanged?: () => void }) {
  const { t, plural } = useI18n();
  const { user, statistics, pet, premium } = data;
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void api.getAchievements().then((r) => setAchievements(r.achievements));
  }, []);

  const photo = getTelegramPhotoUrl();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("profile.user");
  const initial = (user.firstName ?? "?").charAt(0).toUpperCase();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4 p-4">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <div className="bg-tg-button flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{fullName}</h1>
          {user.username && <p className="text-tg-hint text-sm">@{user.username}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip icon="⭐️" label={t("chip.level", { level: statistics.level })} />
        <Chip icon="🔥" label={plural(statistics.currentStreak, "units.day")} />
        <Chip icon="✨" label={t("chip.xp", { xp: statistics.xp })} />
        {premium.active && <Chip icon="💎" label="Premium" />}
      </div>

      {/* Скиллы */}
      <SkillsSection />

      {/* Статистика */}
      <section>
        <h2 className="text-tg-hint mb-2 text-sm font-semibold uppercase">{t("stats.title")}</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label={t("stats.completed")} value={`${statistics.tasksCompleted}`} />
          <Stat label={t("stats.rate")} value={`${Math.round(statistics.completionRate * 100)}%`} />
          <Stat label={t("stats.created")} value={`${statistics.tasksCreated}`} />
          <Stat label={t("stats.streak")} value={`${statistics.currentStreak}`} />
          <Stat label={t("stats.record")} value={`${statistics.longestStreak}`} />
          <Stat label={t("stats.level")} value={`${statistics.level}`} />
        </div>
      </section>

      {/* Достижения */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-tg-hint text-sm font-semibold uppercase">
            {t("achievements.title")}{" "}
            {achievements.length > 0 && `· ${unlockedCount}/${achievements.length}`}
          </h2>
          {achievements.length > 0 && (
            <button onClick={() => setShowAll(true)} className="text-tg-link text-sm">
              {t("common.all")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {achievements.slice(0, 8).map((a) => (
            <Badge key={a.code} achievement={a} />
          ))}
        </div>
      </section>

      {/* Рейтинг */}
      <LeaderboardSection />

      {/* Питомец */}
      <PetSection pet={pet} premium={premium} onChanged={onChanged} />

      {showAll && <AchievementsModal items={achievements} onClose={() => setShowAll(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-tg-secondaryBg rounded-xl py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-tg-hint text-xs">{label}</div>
    </div>
  );
}

function Badge({ achievement }: { achievement: AchievementDto }) {
  const { unlocked, icon } = achievement;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          unlocked ? "bg-tg-button/10 border-tg-link border-2" : "bg-tg-secondaryBg opacity-50 grayscale"
        }`}
      >
        {unlocked ? (icon ?? "🏅") : "🔒"}
      </div>
      <span className="text-tg-hint w-14 truncate text-center text-[10px]">{achievement.title}</span>
    </div>
  );
}

/** Скиллы пользователя + роадмап (каталог шаблонов). Данные грузятся независимо от Home. */
function SkillsSection() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [roadmap, setRoadmap] = useState<SkillTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([api.getSkills(), api.getSkillRoadmap()]);
    setSkills(s.skills);
    setRoadmap(r.roadmap);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .then(() => setError(""))
      .catch(() => setError(t("skills.loadError")))
      .finally(() => setLoading(false));
  }, [load, t]);

  const available = roadmap.filter((tpl) => !tpl.added);

  const handleAdd = useCallback(
    async (code: string) => {
      setAdding(code);
      try {
        await api.addSkill({ code });
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("skills.addError"));
      } finally {
        setAdding(null);
      }
    },
    [load, t],
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-tg-hint text-sm font-semibold uppercase">{t("skills.title")}</h2>
        {available.length > 0 && (
          <button onClick={() => setShowRoadmap(true)} className="text-tg-link text-sm">
            {t("skills.roadmap")}
          </button>
        )}
      </div>

      {loading ? (
        <Card>
          <p className="text-tg-hint text-sm">{t("common.loading")}</p>
        </Card>
      ) : error && skills.length === 0 ? (
        <Card>
          <p className="text-tg-hint text-sm">{error}</p>
        </Card>
      ) : skills.length === 0 ? (
        <Card>
          <p className="text-tg-hint text-sm">{t("skills.empty")}</p>
          {available.length > 0 && (
            <button
              onClick={() => setShowRoadmap(true)}
              className="bg-tg-button text-tg-buttonText mt-3 w-full rounded-xl py-2.5 text-sm font-medium"
            >
              {t("skills.openRoadmap")}
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {skills.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>
      )}

      {showRoadmap && (
        <SkillRoadmapModal
          items={available}
          adding={adding}
          onAdd={handleAdd}
          onClose={() => setShowRoadmap(false)}
        />
      )}
    </section>
  );
}

function SkillCard({ skill }: { skill: SkillDto }) {
  const { t } = useI18n();
  return (
    <Card className="flex items-center gap-3">
      <div className="bg-tg-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl">
        {skill.icon ?? "🎯"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{skill.name}</span>
          <span className="text-tg-hint shrink-0 text-xs">{t("skills.levelAbbr", { level: skill.level })}</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar value={skill.ratio} />
        </div>
        <div className="text-tg-hint mt-1 text-[11px]">
          {t("skills.xpOf", { into: skill.xpIntoLevel, span: skill.xpForLevelSpan })}
        </div>
      </div>
    </Card>
  );
}

function SkillRoadmapModal({
  items,
  adding,
  onAdd,
  onClose,
}: {
  items: SkillTemplateDto[];
  adding: string | null;
  onAdd: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">{t("skills.roadmapTitle")}</h3>
        {items.length === 0 ? (
          <p className="text-tg-hint text-sm">{t("skills.allAdded")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((tpl) => (
              <div key={tpl.code} className="bg-tg-secondaryBg flex items-center gap-3 rounded-xl p-2.5">
                <div className="bg-tg-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl">
                  {tpl.icon ?? "🎯"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tpl.name}</p>
                  {tpl.description && <p className="text-tg-hint truncate text-xs">{tpl.description}</p>}
                </div>
                <button
                  onClick={() => onAdd(tpl.code)}
                  disabled={adding === tpl.code}
                  className="bg-tg-button text-tg-buttonText shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                >
                  {adding === tpl.code ? "…" : t("common.add")}
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="bg-tg-secondaryBg mt-3 w-full rounded-xl py-2.5 text-sm">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

const LEADERBOARD_TOP = 10; // сколько строк показываем в профиле
const LEADERBOARD_PAGE = 20; // размер страницы в модалке «Весь рейтинг»

/** Рейтинг по XP: топ + собственное место. Данные грузятся независимо от Home. */
function LeaderboardSection() {
  const { t } = useI18n();
  const [top, setTop] = useState<LeaderboardEntryDto[]>([]);
  const [me, setMe] = useState<LeaderboardEntryDto | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getLeaderboard(LEADERBOARD_TOP)
      .then((r) => {
        setTop(r.top);
        setMe(r.me);
        setTotal(r.total);
        setError("");
      })
      .catch(() => setError(t("leaderboard.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  // Своя строка отдельно, только если пользователь не попал в видимый топ.
  const meOutsideTop = me && !top.some((e) => e.isMe);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-tg-hint text-sm font-semibold uppercase">{t("leaderboard.title")}</h2>
        {total > top.length && (
          <button onClick={() => setShowAll(true)} className="text-tg-link text-sm">
            {t("leaderboard.seeAll")}
          </button>
        )}
      </div>

      {loading ? (
        <Card>
          <p className="text-tg-hint text-sm">{t("common.loading")}</p>
        </Card>
      ) : error ? (
        <Card>
          <p className="text-tg-hint text-sm">{error}</p>
        </Card>
      ) : top.length === 0 ? (
        <Card>
          <p className="text-tg-hint text-sm">{t("leaderboard.empty")}</p>
        </Card>
      ) : (
        <Card className="space-y-0.5">
          {top.map((e) => (
            <LeaderboardRow key={e.userId} entry={e} />
          ))}
          {meOutsideTop && (
            <>
              <div className="text-tg-hint py-0.5 text-center text-xs">···</div>
              <LeaderboardRow entry={me} />
            </>
          )}
          {me && (
            <p className="text-tg-hint mt-2 text-center text-xs">
              {t("leaderboard.yourPlace", { rank: me.rank, total })}
            </p>
          )}
        </Card>
      )}

      {showAll && <LeaderboardModal total={total} onClose={() => setShowAll(false)} />}
    </section>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntryDto }) {
  const { t } = useI18n();
  const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${entry.isMe ? "bg-tg-button/10" : ""}`}>
      <div className="w-7 shrink-0 text-center text-sm font-semibold">
        {medal ?? <span className="text-tg-hint">{entry.rank}</span>}
      </div>
      <span className={`min-w-0 flex-1 truncate text-sm ${entry.isMe ? "font-semibold" : ""}`}>
        {entry.name}
        {entry.isMe && t("leaderboard.you")}
      </span>
      <span className="text-tg-hint shrink-0 text-xs">{t("skills.levelAbbr", { level: entry.level })}</span>
      <span className="shrink-0 text-xs font-medium tabular-nums">{entry.xp} XP</span>
    </div>
  );
}

/** Полный рейтинг с подгрузкой по страницам (limit/offset) — масштаб под десятки тысяч. */
function LeaderboardModal({ total, onClose }: { total: number; onClose: () => void }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>([]);
  const [me, setMe] = useState<LeaderboardEntryDto | null>(null);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (off: number) => {
      setLoading(true);
      try {
        const r = await api.getLeaderboard(LEADERBOARD_PAGE, off);
        setEntries((prev) => (off === 0 ? r.top : [...prev, ...r.top]));
        setMe(r.me);
        setOffset(off + r.top.length);
        if (r.top.length === 0 || off + r.top.length >= r.total) setDone(true);
        setError("");
      } catch {
        setError(t("common.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void fetchPage(0);
  }, [fetchPage]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">{t("leaderboard.modalTitle", { total })}</h3>
        <div className="space-y-0.5">
          {entries.map((e) => (
            <LeaderboardRow key={e.userId} entry={e} />
          ))}
        </div>
        {error && <p className="text-tg-hint mt-2 text-center text-sm">{error}</p>}
        {!done && entries.length > 0 && (
          <button
            onClick={() => fetchPage(offset)}
            disabled={loading}
            className="bg-tg-secondaryBg mt-3 w-full rounded-xl py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("common.loadMore")}
          </button>
        )}
        {loading && entries.length === 0 && <p className="text-tg-hint text-sm">{t("common.loading")}</p>}
        {me && (
          <p className="text-tg-hint mt-2 text-center text-xs">
            {t("leaderboard.yourPlace", { rank: me.rank, total })}
          </p>
        )}
        <button onClick={onClose} className="bg-tg-button text-tg-buttonText mt-3 w-full rounded-xl py-2.5 text-sm">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

/** Питомец + вход в коллекцию (мульти-петы) и кастомизацию (премиум). */
function PetSection({
  pet,
  premium,
  onChanged,
}: {
  pet: PetDto;
  premium: PremiumStatusDto;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const [openCustom, setOpenCustom] = useState(false);
  const [openPets, setOpenPets] = useState(false);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-tg-hint text-sm font-semibold uppercase">{t("pet.title")}</h2>
        <div className="flex gap-3">
          <button onClick={() => setOpenPets(true)} className="text-tg-link text-sm">
            {t("pet.collection")}
          </button>
          <button onClick={() => setOpenCustom(true)} className="text-tg-link text-sm">
            {t("pet.customize")}
          </button>
        </div>
      </div>
      <PetCard pet={pet} />
      {openCustom && (
        <PetCustomizationModal
          premium={premium}
          onClose={() => setOpenCustom(false)}
          onSaved={() => {
            onChanged?.();
            setOpenCustom(false);
          }}
        />
      )}
      {openPets && (
        <PetsModal
          premium={premium}
          onClose={() => setOpenPets(false)}
          onChanged={() => onChanged?.()}
        />
      )}
    </section>
  );
}

/**
 * Коллекция питомцев (мульти-петы). Список с выбором активного (бесплатно среди своих) +
 * создание нового. Создание >1 — премиум (PremiumFeature.MULTI_PET): для free показываем
 * PremiumGate-заглушку. Любая смена активного зовёт onChanged (refresh Home/PetCard).
 */
function PetsModal({
  premium,
  onClose,
  onChanged,
}: {
  premium: PremiumStatusDto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const canAdd = hasFeature(premium, PremiumFeature.MULTI_PET);
  const [pets, setPets] = useState<PetSummaryDto[]>([]);
  const [activeId, setActiveId] = useState("");
  const [maxPets, setMaxPets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const apply = useCallback((c: { pets: PetSummaryDto[]; activePetId: string; maxPets: number }) => {
    setPets(c.pets);
    setActiveId(c.activePetId);
    setMaxPets(c.maxPets);
  }, []);

  useEffect(() => {
    api
      .getPetCollection()
      .then((r) => {
        apply(r.collection);
        setError("");
      })
      .catch(() => setError(t("pet.loadError")))
      .finally(() => setLoading(false));
  }, [apply, t]);

  const activate = useCallback(
    async (id: string) => {
      if (id === activeId || busy) return;
      setBusy(true);
      try {
        const r = await api.activatePet(id);
        apply(r.collection);
        onChanged();
        setError("");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("pet.switchError"));
      } finally {
        setBusy(false);
      }
    },
    [activeId, busy, apply, onChanged, t],
  );

  const atCap = pets.length >= maxPets && maxPets > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">
          {t("pet.myPets")}
          {maxPets > 0 && ` · ${pets.length}/${maxPets}`}
        </h3>

        {loading ? (
          <p className="text-tg-hint text-sm">{t("common.loading")}</p>
        ) : (
          <div className="space-y-2">
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => void activate(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left ${
                  p.isActive ? "bg-tg-button/10 border-tg-link" : "bg-tg-secondaryBg border-transparent"
                } ${busy ? "opacity-60" : ""}`}
              >
                <span className="text-3xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-tg-hint truncate text-xs">
                    {t("pet.levelStage", { level: p.level, stage: p.stageTitle })}
                  </p>
                </div>
                {p.isActive && (
                  <span className="text-tg-link shrink-0 text-xs font-medium">{t("pet.active")}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-tg-hint mt-3 text-center text-sm">{error}</p>}

        {/* Добавление нового питомца */}
        {!loading && !adding && (
          <div className="mt-3">
            {canAdd ? (
              <button
                onClick={() => setAdding(true)}
                disabled={atCap}
                className="bg-tg-button text-tg-buttonText w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {atCap ? t("pet.limitReached") : t("pet.addPet")}
              </button>
            ) : (
              <PremiumGate
                premium={premium}
                feature={PremiumFeature.MULTI_PET}
                fallback={
                  <div className="bg-tg-secondaryBg text-tg-hint rounded-2xl p-4 text-center text-sm">
                    {t("pet.multiLocked")}
                  </div>
                }
              >
                <></>
              </PremiumGate>
            )}
          </div>
        )}

        {adding && (
          <AddPetForm
            onCancel={() => setAdding(false)}
            onCreated={(c) => {
              apply(c);
              setAdding(false);
              onChanged();
            }}
          />
        )}

        <button onClick={onClose} className="bg-tg-secondaryBg mt-3 w-full rounded-xl py-2.5 text-sm">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

/** Форма создания питомца (премиум): имя + выбор вида из каталога. */
function AddPetForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (c: { pets: PetSummaryDto[]; activePetId: string; maxPets: number }) => void;
}) {
  const { t } = useI18n();
  const [options, setOptions] = useState<PetCustomizationOptionDto[]>([]);
  const [name, setName] = useState("");
  const [speciesCode, setSpeciesCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPetCustomization()
      .then((r) => {
        setOptions(r.customization.options);
        setSpeciesCode(r.customization.options[0]?.speciesCode ?? "");
        setError("");
      })
      .catch(() => setError(t("pet.speciesLoadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const create = useCallback(async () => {
    setSaving(true);
    try {
      const trimmed = name.trim();
      const r = await api.createPet({ speciesCode, ...(trimmed ? { name: trimmed } : {}) });
      onCreated(r.collection);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("pet.createError"));
      setSaving(false);
    }
  }, [name, speciesCode, onCreated, t]);

  return (
    <div className="bg-tg-secondaryBg mt-3 space-y-3 rounded-2xl p-3">
      <p className="text-sm font-medium">{t("pet.newPet")}</p>
      {loading ? (
        <p className="text-tg-hint text-sm">{t("common.loading")}</p>
      ) : (
        <>
          <div>
            <label className="text-tg-hint mb-1 block text-xs">{t("pet.nameOptional")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={PET_NAME_MAX_LENGTH}
              placeholder={t("pet.namePlaceholder")}
              className="bg-tg-bg w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-tg-hint mb-1.5 block text-xs">{t("pet.species")}</label>
            <VariantGrid options={options} selected={speciesCode} onSelect={setSpeciesCode} />
          </div>
        </>
      )}
      {error && <p className="text-tg-hint text-center text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => void create()}
          disabled={saving || loading || !speciesCode}
          className="bg-tg-button text-tg-buttonText flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? t("pet.creating") : t("pet.create")}
        </button>
        <button onClick={onCancel} className="bg-tg-bg flex-1 rounded-xl py-2.5 text-sm">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}

/** Сетка вариантов внешнего вида (виды). Только выбор; смена сохраняется отдельно. */
function VariantGrid({
  options,
  selected,
  onSelect,
  disabled = false,
}: {
  options: PetCustomizationOptionDto[];
  selected: string;
  onSelect?: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = o.speciesCode === selected;
        return (
          <button
            key={o.speciesCode}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(o.speciesCode)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 ${
              active ? "bg-tg-button/10 border-tg-link" : "bg-tg-secondaryBg border-transparent"
            } ${disabled ? "opacity-60" : ""}`}
          >
            <span className="text-3xl">{o.emoji}</span>
            <span className="w-full truncate text-center text-xs">{o.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Модалка кастомизации: имя + выбор внешнего вида. Для бесплатного аккаунта —
 * заглушка PremiumGate (превью вариантов + замок). Сохранение гейтится и на бэке
 * (requireFeature), фронт скрывает форму для надёжности.
 */
function PetCustomizationModal({
  premium,
  onClose,
  onSaved,
}: {
  premium: PremiumStatusDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const unlocked = hasFeature(premium, PremiumFeature.PET_CUSTOMIZATION);
  const [options, setOptions] = useState<PetCustomizationOptionDto[]>([]);
  const [name, setName] = useState("");
  const [speciesCode, setSpeciesCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPetCustomization()
      .then((r) => {
        setOptions(r.customization.options);
        setName(r.customization.current.name);
        setSpeciesCode(r.customization.current.speciesCode);
        setError("");
      })
      .catch(() => setError(t("pet.optionsLoadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const trimmed = name.trim();
  const canSave = unlocked && trimmed.length > 0 && !saving;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.updatePet({ name: trimmed, speciesCode });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.saveError"));
      setSaving(false);
    }
  }, [trimmed, speciesCode, onSaved, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">{t("pet.customizeTitle")}</h3>

        {loading ? (
          <p className="text-tg-hint text-sm">{t("common.loading")}</p>
        ) : (
          <PremiumGate
            premium={premium}
            feature={PremiumFeature.PET_CUSTOMIZATION}
            fallback={
              <div className="space-y-3">
                <VariantGrid options={options} selected={speciesCode} disabled />
                <div className="bg-tg-secondaryBg text-tg-hint rounded-2xl p-4 text-center text-sm">
                  {t("pet.customizeLocked")}
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="text-tg-hint mb-1 block text-xs">{t("pet.name")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={PET_NAME_MAX_LENGTH}
                  placeholder={t("pet.namePlaceholder")}
                  className="bg-tg-secondaryBg w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-tg-hint mb-1.5 block text-xs">{t("pet.appearance")}</label>
                <VariantGrid options={options} selected={speciesCode} onSelect={setSpeciesCode} />
              </div>
            </div>
          </PremiumGate>
        )}

        {error && <p className="text-tg-hint mt-3 text-center text-sm">{error}</p>}

        <div className="mt-4 flex gap-2">
          {unlocked && (
            <button
              onClick={() => void save()}
              disabled={!canSave}
              className="bg-tg-button text-tg-buttonText flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          )}
          <button onClick={onClose} className="bg-tg-secondaryBg flex-1 rounded-xl py-2.5 text-sm">
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AchievementsModal({ items, onClose }: { items: AchievementDto[]; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">{t("achievements.title")}</h3>
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.code} className={`flex items-center gap-3 rounded-xl p-2 ${a.unlocked ? "" : "opacity-50"}`}>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                  a.unlocked ? "bg-tg-button/10" : "bg-tg-secondaryBg grayscale"
                }`}
              >
                {a.unlocked ? (a.icon ?? "🏅") : "🔒"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-tg-hint truncate text-xs">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="bg-tg-secondaryBg mt-3 w-full rounded-xl py-2.5 text-sm">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
