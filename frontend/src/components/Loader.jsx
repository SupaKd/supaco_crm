import './Loader.scss';

const Loader = ({ size = 'medium', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className={`loader loader-${size}`}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`loader loader-${size}`}>
      <div className="spinner"></div>
    </div>
  );
};

export default Loader;
