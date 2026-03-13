"use client";

import { useRef, useState } from "react";
import { useJsonvasStore } from "@/store/useJsonvasStore";
import { PanelSection } from "./PanelSection";
import type { AssetItem } from "@/types/schema";
import styles from "@/styles/workspace.module.css";
import a from "./assetManager.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AssetCard({ asset }: { asset: AssetItem }) {
  const updateAsset = useJsonvasStore((s) => s.updateAsset);
  const removeAsset = useJsonvasStore((s) => s.removeAsset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    updateAsset(asset.id, { data: b64 });
  };

  return (
    <div className={a.assetCard}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleReplace}
      />

      {/* Preview — click to upload/replace */}
      <div className={a.assetPreview} onClick={() => fileRef.current?.click()}>
        {asset.data ? (
          <>
            <img src={asset.data} alt={asset.label} className={a.assetImg} />
            <div className={a.replaceOverlay}>
              <span className={a.replaceLabel}>Replace</span>
            </div>
          </>
        ) : (
          <div className={a.assetEmpty}>
            <span className={a.emptyIcon}>+</span>
            <span className={a.emptyText}>Click to upload</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={a.assetBody}>
        {editing ? (
          <div className={a.editFields}>
            <div>
              <span className={a.fieldLabel}>Label</span>
              <input
                type="text"
                className={a.inlineInput}
                value={asset.label}
                placeholder="e.g. Main Logo"
                onChange={(e) => updateAsset(asset.id, { label: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <span className={a.fieldLabel}>Description</span>
              <input
                type="text"
                className={a.inlineInput}
                value={asset.description}
                placeholder="e.g. Primary brand logo, white version"
                onChange={(e) => updateAsset(asset.id, { description: e.target.value })}
              />
            </div>
            <label className={a.toggleRow}>
              <input
                type="checkbox"
                checked={asset.tintable ?? false}
                onChange={(e) => updateAsset(asset.id, { tintable: e.target.checked })}
              />
              <span className={a.toggleLabel}>Tintable</span>
              <span className={a.toggleHint}>Allow color tinting (for monochrome assets)</span>
            </label>
            <span className={a.assetId}>{asset.id}</span>
          </div>
        ) : (
          <div className={a.assetHeader}>
            <div className={a.assetMeta}>
              <span className={a.assetLabel}>
                {asset.label || "Untitled"}
                {asset.tintable && <span className={a.tintBadge}>Tintable</span>}
              </span>
              <span className={asset.description ? a.assetDesc : a.assetDescEmpty}>
                {asset.description || "No description"}
              </span>
              <span className={a.assetId}>{asset.id}</span>
            </div>
          </div>
        )}

        <div className={a.assetActions}>
          <button
            className={a.actionBtn}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            className={a.actionBtn}
            onClick={() => fileRef.current?.click()}
          >
            {asset.data ? "Replace" : "Upload"}
          </button>
          <button
            className={`${a.actionBtn} ${a.actionBtnDanger}`}
            onClick={() => removeAsset(asset.id)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetManager() {
  const items = useJsonvasStore((s) => s.assets.items);
  const addAsset = useJsonvasStore((s) => s.addAsset);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    const name = file.name.replace(/\.[^/.]+$/, "");
    const asset: AssetItem = {
      id: uid(),
      label: name,
      description: "",
      data: b64,
    };
    addAsset(asset);
    e.target.value = "";
  };

  const handleAddEmpty = () => {
    addAsset({
      id: uid(),
      label: "New Asset",
      description: "",
      data: "",
    });
  };

  return (
    <PanelSection title="Assets">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAdd}
      />

      {items.length === 0 && (
        <div
          className={a.emptyState}
          onClick={() => fileRef.current?.click()}
        >
          <span className={a.emptyStateIcon}>+</span>
          <span className={a.emptyStateText}>
            Drop in logos, icons, or images.<br />
            They become reusable across slides.
          </span>
        </div>
      )}

      <div className={a.assetList}>
        {items.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {items.length > 0 && (
        <div className={a.addRow}>
          <button
            className={a.addBtn}
            onClick={() => fileRef.current?.click()}
          >
            + Upload
          </button>
          <button className={a.addBtn} onClick={handleAddEmpty}>
            + Empty
          </button>
        </div>
      )}
    </PanelSection>
  );
}
