import { useNavigate } from 'react-router-dom';
import UploadForm from '../components/UploadForm.jsx';

export default function Upload() {
  const navigate = useNavigate();

  const handleSuccess = (data) => {
    if (data.uncategorizedCount > 0) {
      navigate(`/uncategorized?importBatchId=${data.importBatchId}&uncategorized=${data.uncategorizedCount}`);
    } else {
      navigate(`/batches/${data.importBatchId}`);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>העלאת קובץ אקסל</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            העלה דף חיוב מ-MAX או Visa. המערכת תנתח את העסקאות,
            תסווג אותן לפי כללי המילון שלך, ותציג סיכום מיידי.
          </p>
        </div>
        <UploadForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
