/**
 * Force-download the public notification PDF on the home page.
 */
(function (global) {
  const PDF_PATH = 'assets/pdf/notification.pdf';
  const DOWNLOAD_NAME = 'Law-Officers-Notification.pdf';

  function triggerBlobDownload(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = DOWNLOAD_NAME;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function wireNotificationDownload() {
    const link = global.document.getElementById('notification-download-link');
    if (!link) {
      return;
    }

    link.setAttribute('href', PDF_PATH);
    link.setAttribute('download', DOWNLOAD_NAME);

    link.addEventListener('click', function (event) {
      event.preventDefault();

      fetch(PDF_PATH, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Notification PDF not found');
          }
          return response.blob();
        })
        .then(triggerBlobDownload)
        .catch(function () {
          global.location.href = PDF_PATH;
        });
    });
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', wireNotificationDownload);
  } else {
    wireNotificationDownload();
  }
})(typeof window !== 'undefined' ? window : global);
