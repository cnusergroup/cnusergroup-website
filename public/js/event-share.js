/* Event Share Functionality */
(function() {
  // Share functionality - Define globally immediately
  window.shareEvent = function(platform) {
    try {
      const url = window.location.href;
      const title = document.title.split(' | ')[0]; // 获取页面标题，去掉网站名称
      const text = title;
      
      console.log('Share function called with platform:', platform);
      console.log('URL:', url);
      console.log('Title:', text);
      
      switch (platform) {
        case 'weibo':
          window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, '_blank');
          break;
        case 'wechat':
          // For WeChat, we'll copy to clipboard and show a message
          if (navigator.clipboard) {
            navigator.clipboard.writeText(`${text} ${url}`).then(() => {
              alert('链接已复制到剪贴板，请在微信中粘贴分享');
            }).catch(() => {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = `${text} ${url}`;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('链接已复制到剪贴板，请在微信中粘贴分享');
            });
          } else {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = `${text} ${url}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('链接已复制到剪贴板，请在微信中粘贴分享');
          }
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'copy':
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
              alert('链接已复制到剪贴板');
            }).catch(() => {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = url;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('链接已复制到剪贴板');
            });
          } else {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('链接已复制到剪贴板');
          }
          break;
        default:
          console.warn('Unknown share platform:', platform);
      }
    } catch (error) {
      console.error('Share function error:', error);
      alert('分享功能暂时不可用，请稍后再试');
    }
  };
  
  console.log('Event share functionality initialized');
})();