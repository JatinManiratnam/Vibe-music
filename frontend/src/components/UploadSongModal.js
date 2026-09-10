import { useState, useRef } from 'react';
import api from '../api/axios';
import { X, UploadCloud, Music, CheckCircle } from 'lucide-react';
import '../styles/UploadSongModal.css';

const UploadSongModal = ({ onClose, onUploaded }) => {
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: '' });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('audio/')) {
      setError('Please select a valid audio file (mp3, wav, m4a, etc.)');
      return;
    }
    setError('');
    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) { setError('Please choose an audio file.'); return; }
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.artist.trim()) { setError('Artist is required.'); return; }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('title', form.title.trim());
      formData.append('artist', form.artist.trim());
      if (form.album.trim()) formData.append('album', form.album.trim());
      if (form.genre.trim()) formData.append('genre', form.genre.trim());

      await api.post('/songs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="upload-header">
          <div className="upload-title">
            <UploadCloud size={20} />
            <span>Upload Song</span>
          </div>
          <button className="upload-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Drop Zone */}
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="drop-zone-file">
                <Music size={28} />
                <span className="drop-file-name">{file.name}</span>
                <span className="drop-file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="drop-zone-empty">
                <UploadCloud size={36} />
                <p>Drag & drop your audio file here</p>
                <span>or click to browse (mp3, wav, m4a, flac · max 50 MB)</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {/* Metadata fields */}
          <div className="upload-fields">
            <div className="upload-row">
              <div className="upload-field">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Song title"
                  value={form.title}
                  onChange={handleChange}
                  disabled={uploading}
                />
              </div>
              <div className="upload-field">
                <label>Artist *</label>
                <input
                  type="text"
                  name="artist"
                  placeholder="Artist name"
                  value={form.artist}
                  onChange={handleChange}
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="upload-row">
              <div className="upload-field">
                <label>Album</label>
                <input
                  type="text"
                  name="album"
                  placeholder="Album (optional)"
                  value={form.album}
                  onChange={handleChange}
                  disabled={uploading}
                />
              </div>
              <div className="upload-field">
                <label>Genre</label>
                <input
                  type="text"
                  name="genre"
                  placeholder="Genre (optional)"
                  value={form.genre}
                  onChange={handleChange}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {error && <p className="upload-error">{error}</p>}

          <button
            type="submit"
            className={`upload-submit-btn ${success ? 'success' : ''}`}
            disabled={uploading || success}
          >
            {success ? (
              <><CheckCircle size={18} /> Uploaded!</>
            ) : uploading ? (
              <><span className="upload-spinner" /> Uploading...</>
            ) : (
              <><UploadCloud size={18} /> Upload Song</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadSongModal;
