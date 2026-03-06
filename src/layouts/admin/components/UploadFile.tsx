import React, { useEffect, useMemo, useState } from "react";

export interface UploadFileValue {
  existingUrls: string[];
  newFiles: File[];
}

interface UploadFileProps {
  onChange: (value: UploadFileValue) => void;
  existingImageUrls?: string[];
}

const UploadFile: React.FC<UploadFileProps> = ({
  onChange,
  existingImageUrls = [],
}) => {
  const [existingUrls, setExistingUrls] = useState<string[]>(existingImageUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    setExistingUrls(existingImageUrls);
  }, [existingImageUrls]);

  useEffect(() => {
    onChange({ existingUrls, newFiles });
  }, [existingUrls, newFiles, onChange]);

  const newFilePreviews = useMemo(
    () => newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    })),
    [newFiles]
  );

  useEffect(() => {
    return () => {
      newFilePreviews.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    };
  }, [newFilePreviews]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!selectedFiles.length) {
      return;
    }
    setNewFiles((prev) => [...prev, ...selectedFiles]);
    event.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div>
      <input type="file" accept="image/*" multiple onChange={handleFileChange} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        {existingUrls.map((url, index) => (
          <div key={`existing-${index}`} style={{ position: "relative" }}>
            <img src={url} alt={`existing-${index}`} style={{ width: 100, height: 100, objectFit: "cover" }} />
            <button
              type="button"
              onClick={() => removeExistingImage(index)}
              style={deleteButtonStyle}
            >
              X
            </button>
          </div>
        ))}
        {newFilePreviews.map(({ file, previewUrl }, index) => (
          <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
            <img src={previewUrl} alt={file.name} style={{ width: 100, height: 100, objectFit: "cover" }} />
            <button
              type="button"
              onClick={() => removeNewFile(index)}
              style={deleteButtonStyle}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const deleteButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  backgroundColor: "#ff4d4d",
  color: "#fff",
  border: "none",
  padding: "5px",
  cursor: "pointer",
  borderRadius: "50%",
  fontSize: "12px",
};

export default UploadFile;