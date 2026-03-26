import { buildFormsHtml } from './formHtml';

// Print all 4 NBSC forms via hidden iframe
export const printSubmission = (submission: any) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    alert('Unable to open print dialog. Please try again.');
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(buildFormsHtml(submission));
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    } catch {
      alert('Unable to print. Please check your printer and try again.');
      document.body.removeChild(iframe);
    }
  }, 800);
};

// Print multiple submissions one after another
export const printAllSubmissions = (submissions: any[]) => {
  if (!submissions || submissions.length === 0) {
    alert('No submissions to print.');
    return;
  }
  submissions.forEach((submission, i) => {
    setTimeout(() => printSubmission(submission), i * 800);
  });
};
