type AudioUploaderProps = {
  onFile: (file: File) => void;
};

export default function AudioUploader({ onFile }: AudioUploaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <label className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg cursor-pointer hover:scale-105 transition">
        Chọn file audio (MP3)
        {/* Hidden file input for audio upload */}
        <input
          type="file"
          accept="audio/mp3,audio/*"
          onChange={e => {
            // When a file is selected, pass it to the parent component
            if (e.target.files && e.target.files[0]) {
              onFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />
      </label>
    </div>
  );
}
