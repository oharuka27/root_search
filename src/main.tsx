import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownUp,
  MapPin,
  Search,
  Home,
  History,
  SlidersHorizontal,
  Footprints,
  Leaf,
  Coffee,
  Cat,
  Heart,
  ShieldCheck,
  X,
  Check,
  Plus,
  Navigation,
  Map as MapIcon,
} from "lucide-react";
import Map from "./Map";
import {
  places,
  categories,
  rankSpots,
  distance,
  inOsaka,
  type Place,
  type Category,
  type Spot,
} from "../shared/data";
import { empty, KEY, readSaved, writeSaved, type Saved } from "./storage";
import { fetchSpots } from "./mcp";
import "@fontsource-variable/noto-sans-jp";
import "./style.css";
const icons = { park: Leaf, cafe: Coffee, cat: Cat };
type Picker = "start" | "end" | "home" | null;
function App() {
  const [initial] = useState(readSaved);
  const [saved, setSaved] = useState(initial.data);
  const [notice, setNotice] = useState(initial.error);
  const [start, setStart] = useState<Place>(places[0]);
  const [end, setEnd] = useState<Place>(places[1]);
  const [filters, setFilters] = useState<Category[]>(["park", "cafe", "cat"]);
  const [budget, setBudget] = useState(45);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sample" | "live">("sample");
  const [picker, setPicker] = useState<Picker>(null);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [settings, setSettings] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const modalOpen = Boolean((picker && !picking) || settings);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPicker(null);
        setSettings(false);
        setConfirmClear(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modalOpen]);
  function save(next: Saved) {
    setSaved(next);
    const error = writeSaved(next);
    if (error) setNotice(error);
  }
  function invalidate() {
    setSpots([]);
    setSelected(null);
    setSearched(false);
  }
  function openPicker(which: Picker, newTab = "search") {
    setPicker(which);
    setTab(newTab);
    setQuery("");
    setPoint(null);
    setCustomName("");
    setCustomAddress("");
  }
  function choose(p: Place) {
    if (picker === "home") {
      save({ ...saved, home: p });
      setStart(p);
      invalidate();
      setNotice("自宅をこのブラウザに保存しました。");
    } else {
      if (picker === "start") setStart(p);
      else setEnd(p);
      save({
        ...saved,
        history: [p, ...saved.history.filter((h) => h.id !== p.id)].slice(
          0,
          20,
        ),
      });
      invalidate();
    }
    setPicker(null);
    setPicking(false);
  }
  const ranked = rankSpots(start, end, spots, filters, budget);
  const visible = onlyFavorites
    ? ranked.filter((s) => saved.favorites.includes(s.id))
    : ranked;
  const active = ranked.find((s) => s.id === selected?.id) || null;
  const km = active?.km ?? distance(start, end) * 1.3;
  const walk = Math.ceil((km / 4.5) * 60);
  async function search() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setSelected(null);
    setSpots([]);
    setSearched(false);
    try {
      const found = await fetchSpots(start, end, mode);
      setSpots(found);
      setSearched(true);
      const ranked = rankSpots(start, end, found, filters, budget);
      setSelected(ranked[0] || null);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "接続に失敗しました。MCPサーバーの起動をご確認ください。",
      );
    } finally {
      setBusy(false);
    }
  }
  function toggleCategory(c: Category) {
    setFilters(
      filters.includes(c) ? filters.filter((f) => f !== c) : [...filters, c],
    );
    setSelected(null);
  }
  function favorite(id: string) {
    save({
      ...saved,
      favorites: saved.favorites.includes(id)
        ? saved.favorites.filter((f) => f !== id)
        : [...saved.favorites, id].slice(-500),
    });
  }
  function directions() {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", `${start.lat},${start.lng}`);
    url.searchParams.set("destination", `${end.lat},${end.lng}`);
    url.searchParams.set("travelmode", "walking");
    if (active)
      url.searchParams.set("waypoints", `${active.lat},${active.lng}`);
    return url.toString();
  }
  return (
    <>
      <header className="header">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Footprints size={24} />
          </span>
          よりみち<span className="brand-en">YORIMICHI</span>
        </a>
        <nav>
          <button
            className={!onlyFavorites ? "nav-active" : ""}
            onClick={() => setOnlyFavorites(false)}
          >
            寄り道をさがす
          </button>
          <button
            className={onlyFavorites ? "nav-active" : ""}
            onClick={() => setOnlyFavorites(true)}
          >
            <Heart size={15} />
            お気に入り <span>{saved.favorites.length}</span>
          </button>
        </nav>
        <button className="privacy-button" onClick={() => setSettings(true)}>
          <ShieldCheck size={16} />
          <span>このブラウザだけに保存</span>
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> OSAKA WALKING GUIDE
            </div>
            <h1>
              いつもの道に、
              <br className="mobile-break" />
              小さな発見を。
            </h1>
            <p>
              ちょっと気になる場所へ。あなたにぴったりの寄り道を見つけよう。
            </p>
          </div>
          <div className="osaka-badge">
            <MapPin size={15} />
            大阪エリア <span>β</span>
          </div>
        </section>
        <div className="workspace">
          <aside className="planner">
            <div className="panel-title">
              <h2>どこへ、寄り道する？</h2>
              <span>01 — PLAN</span>
            </div>
            <div className="locations">
              <label>出発地</label>
              <button
                className="location-input"
                onClick={() => openPicker("start")}
                disabled={busy}
              >
                <span className="endpoint">A</span>
                <span>{start.name}</span>
                <Search size={17} />
              </button>
              <div className="quick-actions">
                <button
                  onClick={() =>
                    saved.home
                      ? (setStart(saved.home), invalidate())
                      : openPicker("home", "custom")
                  }
                  disabled={busy}
                >
                  <Home size={13} />
                  自宅
                </button>
                <button
                  onClick={() => openPicker("start", "custom")}
                  disabled={busy}
                >
                  <Plus size={13} />
                  住所指定
                </button>
                <button
                  onClick={() => openPicker("start", "history")}
                  disabled={busy}
                >
                  <History size={13} />
                  履歴
                </button>
              </div>
              <div className="destination-label">
                <label>目的地</label>
                <button
                  aria-label="出発地と目的地を入れ替える"
                  onClick={() => {
                    setStart(end);
                    setEnd(start);
                    invalidate();
                  }}
                  disabled={busy}
                >
                  <ArrowDownUp size={15} />
                </button>
              </div>
              <button
                className="location-input"
                onClick={() => openPicker("end")}
                disabled={busy}
              >
                <span className="endpoint end">B</span>
                <span>{end.name}</span>
                <Search size={17} />
              </button>
            </div>
            <div className="filter-section">
              <label>
                どんな場所に立ち寄る？ <small>複数選択可</small>
              </label>
              <div className="category-buttons">
                {(Object.keys(categories) as Category[]).map((c) => {
                  const Icon = icons[c];
                  return (
                    <button
                      key={c}
                      aria-pressed={filters.includes(c)}
                      className={filters.includes(c) ? "chosen" : ""}
                      onClick={() => toggleCategory(c)}
                    >
                      <Icon size={20} />
                      {categories[c].label}
                      {filters.includes(c) && (
                        <Check size={12} className="check" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="budget">
              <label>
                寄り道に使える時間{" "}
                <strong>
                  ＋{budget}
                  <small> 分</small>
                </strong>
              </label>
              <input
                aria-label="寄り道に使える時間"
                type="range"
                min="15"
                max="90"
                step="15"
                value={budget}
                onChange={(e) => {
                  setBudget(Number(e.target.value));
                  setSelected(null);
                }}
              />
              <div className="range-labels">
                <span>15分</span>
                <span>滞在時間を含む</span>
                <span>90分</span>
              </div>
            </div>
            <div className="source-select">
              <label htmlFor="source">スポット情報</label>
              <select
                id="source"
                disabled={busy}
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as typeof mode);
                  invalidate();
                }}
              >
                <option value="sample">サンプルで試す</option>
                <option value="live">OpenStreetMapから取得</option>
              </select>
            </div>
            <button
              className="search-button"
              disabled={
                busy ||
                filters.length === 0 ||
                (mode === "live" && !saved.external)
              }
              onClick={search}
            >
              {busy ? <span className="spinner" /> : <Search size={18} />}{" "}
              {busy ? "寄り道をさがしています…" : "寄り道をさがす"}
              {!busy && <ArrowRight size={17} />}
            </button>
            {mode === "live" && !saved.external && (
              <button className="text-button" onClick={() => setSettings(true)}>
                外部地図サービスの利用を設定する
              </button>
            )}
            <div className="planner-note">
              <Leaf size={17} />
              <p>
                急がない日には、
                <br />
                いつもと違う道を歩いてみよう。
              </p>
            </div>
            <div className="mcp-label">
              <span /> MCPでスポットを取得 · 徒歩プラン
            </div>
          </aside>
          <section className="explore">
            <div className="map-wrap">
              <Map
                start={start}
                end={end}
                spots={visible}
                selected={active}
                external={saved.external}
                picking={picking}
                onPick={(lat, lng) => {
                  if (!inOsaka({ lat, lng })) {
                    setNotice("大阪市周辺の地図上で位置を選んでください。");
                    return;
                  }
                  setPoint({ lat, lng });
                  setPicking(false);
                }}
              />
              <div className="map-top">
                <span>
                  <span className="live-dot" />
                  {saved.external ? "大阪の地図" : "プライベート表示"}
                </span>
                <span>
                  <Footprints size={14} />
                  徒歩
                </span>
              </div>
              {!saved.external && !picking && (
                <div className="map-consent">
                  <MapIcon size={24} />
                  <h3>街を見ながら、寄り道を。</h3>
                  <p>
                    地図を表示すると、表示範囲とIPアドレスが
                    <br />
                    OpenStreetMapへ送られます。
                  </p>
                  <button onClick={() => save({ ...saved, external: true })}>
                    地図を表示する <ArrowUpRight size={15} />
                  </button>
                  <small>住所・履歴はブラウザ内に保存されます</small>
                </div>
              )}
              {picking && (
                <div className="picking-banner">
                  自宅・住所の位置を地図上でクリックしてください
                </div>
              )}
              <div className="map-bottom">
                <span className="dashed" />
                点線は地点を結ぶ概略です（道路経路ではありません）
              </div>
            </div>
            <div className="results-heading">
              <div>
                <span className="eyebrow">A LITTLE DETOUR</span>
                <h2>
                  {onlyFavorites ? "お気に入りの寄り道" : "あなたの寄り道候補"}{" "}
                  <span>{visible.length}</span>
                </h2>
              </div>
              <span className="sort">
                <SlidersHorizontal size={14} />
                追加時間が短い順
              </span>
            </div>
            {notice && (
              <div className="notice" role="status">
                {notice}
                <button aria-label="通知を閉じる" onClick={() => setNotice("")}>
                  <X size={14} />
                </button>
              </div>
            )}
            {mode === "sample" && searched && (
              <p className="sample-note">
                サンプルデータです。喫茶店・猫カフェは架空のスポットで、営業情報ではありません。
              </p>
            )}
            <div className="results" aria-live="polite">
              {!searched && !busy ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <Footprints size={24} />
                  </span>
                  <h3>次の道には、どんな出会いがあるだろう。</h3>
                  <p>
                    出発地と目的地を選んで、「寄り道をさがす」を押してください。
                  </p>
                  <div className="empty-tags">
                    <span>
                      <Leaf size={14} />
                      緑でひと休み
                    </span>
                    <span>
                      <Coffee size={14} />
                      一杯のしあわせ
                    </span>
                    <span>
                      <Cat size={14} />
                      猫に会いに
                    </span>
                  </div>
                </div>
              ) : busy ? (
                <div className="empty-state">
                  <span className="spinner dark" />
                  <p>MCPでスポットを取得しています…</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <Search size={24} />
                  <h3>条件に合う寄り道が見つかりませんでした</h3>
                  <p>
                    時間を増やす、カテゴリを変える、または別の目的地を試してください。
                  </p>
                </div>
              ) : (
                visible.map((s, i) => {
                  const Icon = icons[s.category];
                  return (
                    <article
                      key={s.id}
                      className={`spot-card ${active?.id === s.id ? "selected" : ""}`}
                    >
                      <div className={`spot-art ${s.category}`}>
                        <Icon size={38} strokeWidth={1} />
                        <span>{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="spot-info">
                        <div className="spot-meta">
                          <span>
                            <Icon size={12} />
                            {categories[s.category].label}
                          </span>
                          <span>＋約{s.addedMinutes}分</span>
                        </div>
                        <h3>{s.name}</h3>
                        <p>{s.description}</p>
                        <div className="spot-bottom">
                          <small>
                            滞在 約{s.stay}分 · 追加の徒歩 約{s.extra}分
                          </small>
                          <button
                            onClick={() =>
                              setSelected(active?.id === s.id ? null : s)
                            }
                          >
                            {active?.id === s.id ? (
                              <>
                                <Check size={13} />
                                選択中
                              </>
                            ) : (
                              <>
                                この寄り道へ
                                <ArrowRight size={13} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        className="favorite"
                        aria-label={`${s.name}を${saved.favorites.includes(s.id) ? "お気に入りから削除" : "お気に入りに保存"}`}
                        aria-pressed={saved.favorites.includes(s.id)}
                        onClick={() => favorite(s.id)}
                      >
                        <Heart
                          size={18}
                          fill={
                            saved.favorites.includes(s.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </article>
                  );
                })
              )}
            </div>
            {active && (
              <div className="route-summary">
                <div>
                  <small>この寄り道プラン</small>
                  <strong>
                    <Footprints size={17} />約{km.toFixed(1)} km{" "}
                    <span>
                      徒歩 約{walk}分 ＋ 滞在 {active.stay}分
                    </span>
                  </strong>
                </div>
                <a href={directions()} target="_blank" rel="noreferrer">
                  Google マップで道順を見る <ArrowUpRight size={16} />
                </a>
                <p>
                  距離・時間は直線距離からの概算です。リンクを開くと出発地・目的地・経由地の座標がGoogleに送信されます。
                </p>
              </div>
            )}
          </section>
        </div>
        <footer>
          <span className="footer-brand">
            <Footprints size={16} />
            よりみち
          </span>
          <span>目的地までの時間も、好きになる。</span>
          <button onClick={() => setSettings(true)}>
            保存データとプライバシー <ArrowUpRight size={12} />
          </button>
        </footer>
      </main>
      {picker && !picking && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="場所を選ぶ"
          >
            <div className="modal-heading">
              <h2>
                {picker === "home"
                  ? "自宅を登録"
                  : picker === "start"
                    ? "出発地を選ぶ"
                    : "目的地を選ぶ"}
              </h2>
              <button aria-label="閉じる" onClick={() => setPicker(null)}>
                <X />
              </button>
            </div>
            <div className="tabs">
              {[
                ["search", "検索"],
                ["home", "自宅"],
                ["custom", "カスタム住所"],
                ["history", "履歴"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "search" && (
              <>
                <input
                  autoFocus
                  aria-label="駅・公園名で検索"
                  placeholder="大阪の駅・公園名で検索"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <p className="helper">
                  収録済みの大阪の主要地点を検索します。その他の住所は「カスタム住所」で指定できます。
                </p>
                <div className="place-list">
                  {places
                    .filter((p) => (p.name + p.address).includes(query.trim()))
                    .map((p) => (
                      <button key={p.id} onClick={() => choose(p)}>
                        <MapPin size={17} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.address}</small>
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  {!places.some((p) =>
                    (p.name + p.address).includes(query.trim()),
                  ) && (
                    <p>
                      見つかりませんでした。カスタム住所で位置を指定してください。
                    </p>
                  )}
                </div>
              </>
            )}
            {tab === "home" && (
              <>
                {saved.home ? (
                  <div className="home-saved">
                    <Home />
                    <h3>{saved.home.name}</h3>
                    <p>{saved.home.address}</p>
                    <button
                      className="primary"
                      onClick={() => choose(saved.home!)}
                    >
                      この場所を選ぶ
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setPicker("home");
                        setTab("custom");
                      }}
                    >
                      自宅を変更する
                    </button>
                  </div>
                ) : (
                  <div className="home-saved">
                    <Home />
                    <p>自宅はまだ登録されていません。</p>
                    <button
                      className="primary"
                      onClick={() => {
                        setPicker("home");
                        setTab("custom");
                      }}
                    >
                      自宅を登録する
                    </button>
                  </div>
                )}
              </>
            )}
            {tab === "history" && (
              <div className="place-list">
                {saved.history.length === 0 ? (
                  <p>まだ指定履歴はありません。</p>
                ) : (
                  saved.history.map((p) => (
                    <button key={p.id} onClick={() => choose(p)}>
                      <History size={17} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.address}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))
                )}
              </div>
            )}
            {tab === "custom" && (
              <div className="custom-form">
                <label>
                  場所の名前
                  <input
                    placeholder={
                      picker === "home" ? "自宅" : "例：待ち合わせ場所"
                    }
                    value={customName}
                    maxLength={200}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </label>
                <label>
                  住所（このブラウザだけに保存）
                  <input
                    placeholder="例：大阪市北区…"
                    value={customAddress}
                    maxLength={300}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                </label>
                <p className="helper">
                  住所からの自動変換は行いません。地図または緯度・経度で正確な位置を指定してください。
                </p>
                <div className="coordinate-inputs">
                  <label>
                    緯度
                    <input
                      aria-label="緯度"
                      type="number"
                      step="any"
                      value={point?.lat ?? ""}
                      onChange={(e) =>
                        setPoint({
                          lat: Number(e.target.value),
                          lng: point?.lng ?? 135.5,
                        })
                      }
                    />
                  </label>
                  <label>
                    経度
                    <input
                      aria-label="経度"
                      type="number"
                      step="any"
                      value={point?.lng ?? ""}
                      onChange={(e) =>
                        setPoint({
                          lat: point?.lat ?? 34.7,
                          lng: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  className="outline"
                  onClick={() => {
                    if (!saved.external) {
                      setNotice(
                        "地図で位置を指定するには、先に「地図を表示する」を押してください。",
                      );
                      setPicker(null);
                    } else setPicking(true);
                  }}
                >
                  <Navigation size={15} />
                  地図で位置を指定する
                </button>
                <button
                  className="primary"
                  disabled={
                    !point ||
                    !inOsaka(point) ||
                    !(customName.trim() || picker === "home")
                  }
                  onClick={() =>
                    point &&
                    choose({
                      id: crypto.randomUUID(),
                      name:
                        customName.trim() ||
                        (picker === "home" ? "自宅" : "指定した場所"),
                      address: customAddress.trim(),
                      ...point,
                    })
                  }
                >
                  この場所を保存して選ぶ
                </button>
                <small>
                  対応範囲：大阪市周辺（緯度34.55〜34.85、経度135.35〜135.65）
                </small>
              </div>
            )}
          </section>
        </div>
      )}
      {picking && (
        <button className="cancel-pick" onClick={() => setPicking(false)}>
          位置の指定をキャンセル
        </button>
      )}
      {settings && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="保存データとプライバシー"
          >
            <div className="modal-heading">
              <h2>
                <ShieldCheck size={21} />
                保存データとプライバシー
              </h2>
              <button
                aria-label="閉じる"
                onClick={() => {
                  setSettings(false);
                  setConfirmClear(false);
                }}
              >
                <X />
              </button>
            </div>
            <p>
              自宅・住所・指定履歴・お気に入りは、このブラウザのlocalStorageにのみ保存します。サーバーへの保存や他のブラウザへの同期は行いません。
            </p>
            <p>
              同じ端末・同じブラウザのプロファイルを共有する人は保存内容を閲覧できます。別の利用者とはブラウザのプロファイルを分けてください。
            </p>
            <label className="switch-row">
              <span>
                外部地図サービスを利用する
                <small>
                  地図表示：OpenStreetMapへ表示範囲とIPアドレスを送信。実データ検索：Overpassへ大まかな検索範囲を送信します。
                </small>
              </span>
              <input
                type="checkbox"
                checked={saved.external}
                onChange={(e) => save({ ...saved, external: e.target.checked })}
              />
            </label>
            <p className="helper">
              MCPへは丸めた検索範囲のみ送信します。住所名・自宅名・履歴は送りません。アクセス解析や広告はありません。
            </p>
            <div className="data-actions">
              <button
                className="outline"
                onClick={() => {
                  save({ ...saved, home: null });
                  setNotice("保存した自宅を削除しました。");
                }}
              >
                自宅を削除
              </button>
              <button
                className="outline"
                onClick={() => save({ ...saved, history: [] })}
              >
                履歴を削除
              </button>
            </div>
            <button className="danger" onClick={() => setConfirmClear(true)}>
              このアプリの保存データをすべて削除
            </button>
            {confirmClear && (
              <div className="confirm">
                <p>自宅・履歴・お気に入りを削除しますか？</p>
                <button
                  className="danger"
                  onClick={() => {
                    try {
                      localStorage.removeItem(KEY);
                      setSaved({ ...empty });
                      setStart(places[0]);
                      setEnd(places[1]);
                      invalidate();
                      setSettings(false);
                      setConfirmClear(false);
                      setNotice("保存データをすべて削除しました。");
                    } catch {
                      setNotice(
                        "保存データを削除できませんでした。ブラウザの設定をご確認ください。",
                      );
                    }
                  }}
                >
                  削除する
                </button>
                <button
                  className="text-button"
                  onClick={() => setConfirmClear(false)}
                >
                  キャンセル
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
