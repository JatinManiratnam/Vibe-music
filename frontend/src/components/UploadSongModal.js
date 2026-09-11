import { useState, useRef } from 'react';
import api from '../api/axios';
import { X, UploadCloud, CheckCircle } from 'lucide-react';
import '../styles/UploadSongModal.css';

const UploadSongModal = ({ onClose, onUploaded }) => {
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: '' });
  const [standardFile, setStandardFile] = useState(null);
  const [losslessFile, setLosslessFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const standardInputRef = useRef();
  const losslessInputRef = useRef();
  const coverInputRef = useRef();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStandardFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/aac'].includes(selected.type) && !selected.name.match(/\.(mp3|m4a|aac|ogg)$/i)) {
      setError('Standard audio must be MP3, M4A, AAC, or OGG');
      return;
    }
    setError('');
    setStandardFile(selected);
  };

  const handleLosslessFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!['audio/flac', 'audio/wav', 'audio/x-flac', 'audio/vnd.wave'].includes(selected.type) && !selected.name.match(/\.(flac|wav)$/i)) {
      setError('Lossless audio must be FLAC or WAV');
      return;
    }
    setError('');
    setLosslessFile(selected);
  };

  const handleCoverFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Please select a valid image file for the cover.');
      return;
    }
    setError('');
    setCoverFile(selected);
    setCoverPreview(URL.createObjectURL(selected));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!standardFile && !losslessFile) { setError('Please choose at least one audio file (Standard or Lossless).'); return; }
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.artist.trim()) { setError('Artist is required.'); return; }

    try {
      setUploading(true);
      const formData = new FormData();
      if (standardFile) formData.append('audioStandard', standardFile);
      if (losslessFile) formData.append('audioLossless', losslessFile);
      if (coverFile) formData.append('cover', coverFile);
      
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
          {/* Audio Variants Upload Zone */}
          <div className="upload-quality-section" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="quality-box" style={{ flex: 1, padding: '1rem', border: '1px dashed #3f3f4e', borderRadius: '8px', textAlign: 'center', background: standardFile ? '#2c2c35' : 'transparent' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Standard Quality</h4>
              <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '0 0 1rem 0' }}>MP3, AAC, M4A, OGG<br/>(Best for streaming)</p>
              {standardFile ? (
                <div style={{ fontSize: '0.9rem', color: '#1db954' }}>
                  {standardFile.name} ({(standardFile.size / 1024 / 1024).toFixed(2)} MB)
                  <br/><button type="button" onClick={() => setStandardFile(null)} style={{ background:'none', border:'none', color:'#ff4444', cursor:'pointer', marginTop:'0.5rem' }}>Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => standardInputRef.current.click()} className="upload-cover-btn" style={{ padding: '0.5rem 1rem', background: '#3f3f4e', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>Select File</button>
              )}
              <input ref={standardInputRef} type="file" accept=".mp3,.aac,.m4a,.ogg,audio/mpeg,audio/mp4,audio/aac,audio/ogg" style={{ display: 'none' }} onChange={handleStandardFile} />
            </div>

            <div className="quality-box" style={{ flex: 1, padding: '1rem', border: '1px dashed #3f3f4e', borderRadius: '8px', textAlign: 'center', background: losslessFile ? '#2c2c35' : 'transparent' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Lossless Quality</h4>
              <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '0 0 1rem 0' }}>FLAC, WAV<br/>(High fidelity, larger file)</p>
              {losslessFile ? (
                <div style={{ fontSize: '0.9rem', color: '#1db954' }}>
                  {losslessFile.name} ({(losslessFile.size / 1024 / 1024).toFixed(2)} MB)
                  <br/><button type="button" onClick={() => setLosslessFile(null)} style={{ background:'none', border:'none', color:'#ff4444', cursor:'pointer', marginTop:'0.5rem' }}>Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => losslessInputRef.current.click()} className="upload-cover-btn" style={{ padding: '0.5rem 1rem', background: '#3f3f4e', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>Select File</button>
              )}
              <input ref={losslessInputRef} type="file" accept=".flac,.wav,audio/flac,audio/wav" style={{ display: 'none' }} onChange={handleLosslessFile} />
            </div>
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
            
            <div className="upload-row">
              <div className="upload-field" style={{ width: '100%' }}>
                <label>Cover Image (optional) - max 5MB</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="upload-cover-btn"
                    onClick={() => coverInputRef.current.click()}
                    disabled={uploading}
                    style={{ padding: '0.5rem 1rem', background: '#2c2c35', border: '1px solid #3f3f4e', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                  >
                    Select Image
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCoverFile}
                  />
                  {coverFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#aaa' }}>{coverFile.name}</span>
                      {coverPreview && (
                        <img src={coverPreview} alt="Cover preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      )}
                    </div>
                  )}
                </div>
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
