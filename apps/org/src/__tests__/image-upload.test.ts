import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CmsActivitiesEditorView } from '../components/cms/views/CmsActivitiesEditorView';
import { CmsImageDropzone } from '../components/cms/views/CmsImageDropzone';
import {
  deriveShotLabelFromFileName,
  formatFileSize,
  processImageFile,
  processImageFiles,
} from '../lib/image-upload';
import { MOCK_ORG_ACTIVITIES } from '../mocks/showcase-content.mock';

describe('@ants/org Image Upload Utility & CmsImageDropzone', () => {
  it('formats file sizes accurately into human-readable labels', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(102400)).toBe('100 KB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('derives human-readable shot labels from raw file names', () => {
    expect(deriveShotLabelFromFileName('hackathon-finals-stage.jpg')).toBe(
      'Hackathon Finals Stage'
    );
    expect(deriveShotLabelFromFileName('exam_hall_prep_morning.png')).toBe(
      'Exam Hall Prep Morning'
    );
    expect(deriveShotLabelFromFileName('students+meet+yangon.webp')).toBe(
      'Students Meet Yangon'
    );
    expect(deriveShotLabelFromFileName('')).toBe('Uploaded Photo');
  });

  it('processes image files defensively and handles batch uploads', async () => {
    // Create a mock image file
    const file = new File(['fake-image-bytes'], 'science-lab-demo.jpg', {
      type: 'image/jpeg',
    });

    const result = await processImageFile(file);
    expect(result.fileName).toBe('science-lab-demo.jpg');
    expect(result.shotLabel).toBe('Science Lab Demo');
    expect(result.dataUrl).toContain('data:');

    const batch = await processImageFiles([file]);
    expect(batch.length).toBe(1);
    expect(batch[0]?.shotLabel).toBe('Science Lab Demo');

    // Filters out non-image files
    const txtFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
    const emptyBatch = await processImageFiles([txtFile]);
    expect(emptyBatch.length).toBe(0);
  });

  it('renders CmsImageDropzone and CmsActivitiesEditorView upload controls on SSR', () => {
    const dropzoneHtml = renderToStaticMarkup(
      React.createElement(CmsImageDropzone, {
        label: 'Upload New Cover Photograph',
        description: 'Drag & drop or click to replace cover image',
        buttonLabel: 'Upload Cover Image',
        onUpload: () => undefined,
      })
    );
    expect(dropzoneHtml).toContain('Upload New Cover Photograph');
    expect(dropzoneHtml).toContain('Upload Cover Image');

    const compactHtml = renderToStaticMarkup(
      React.createElement(CmsImageDropzone, {
        compact: true,
        buttonLabel: 'Replace Photo',
        onUpload: () => undefined,
      })
    );
    expect(compactHtml).toContain('Replace Photo');

    const activitiesHtml = renderToStaticMarkup(
      React.createElement(CmsActivitiesEditorView, {
        activities: MOCK_ORG_ACTIVITIES,
        initialSubTab: 'gallery',
        onUpsert: () => undefined,
        onDelete: () => undefined,
        onMove: () => undefined,
      })
    );
    expect(activitiesHtml).toContain('Activities &amp; Hackathon Events');
    expect(activitiesHtml).toContain('Upload New Cover Photograph');
    expect(activitiesHtml).toContain('Batch Upload Gallery Photos');
  });
});
