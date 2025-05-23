import { useState } from "react";

const YT_API_KEY = "AIzaSyAmNoBRiFlCR19i7SopE-doeqrZjkTUrO8"; // <- Nhớ đổi!

type YTVideo = {
  id: string;
  title: string;
  thumbnail: string;
};

type Props = {
  onAddToPlaylist: (song: { name: string; youtubeId: string; type: "youtube"; thumbnail: string }) => void;
  onClose: () => void;
};

export default function YouTubeSearchBar({ onAddToPlaylist, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(
          query
        )}&key=${YT_API_KEY}`
      );
      const data = await res.json();
      const videos =
        data.items?.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
        })) || [];
      setResults(videos);
    } catch (err) {
      alert("YouTube API error.");
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed top-20 right-10 z-[100] bg-[#23243a] rounded-xl shadow-2xl border border-indigo-800 p-4 min-w-[350px]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between mb-2">
        <span className="text-indigo-100 font-bold">YouTube Search</span>
        <button className="text-white text-xl" onClick={onClose}>✕</button>
      </div>
      <form className="flex gap-2 mb-2" onSubmit={handleSearch}>
        <input
          className="flex-1 bg-black/40 border border-indigo-500 rounded px-3 py-2 text-white focus:outline-none"
          placeholder="Search YouTube music…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="px-4 py-2 bg-indigo-600 rounded text-white font-semibold" type="submit">
          Search
        </button>
      </form>
      {loading && <div className="text-indigo-200 mb-1">Searching…</div>}
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-indigo-900/30 p-1 rounded"
              onClick={() => {
                onAddToPlaylist({
                  name: v.title,
                  youtubeId: v.id,
                  type: "youtube",
                  thumbnail: v.thumbnail,
                });
                setResults([]);
                setQuery("");
                onClose();
              }}
            >
              <img src={v.thumbnail} alt="" className="w-12 h-8 rounded object-cover" />
              <span className="flex-1 text-indigo-100 text-sm">{v.title}</span>
              <button className="text-indigo-400 hover:text-indigo-200 px-2 py-1 rounded border border-indigo-400 ml-2 text-xs">
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
