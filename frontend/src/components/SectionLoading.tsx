// Drop-in replacement for the "if (!data) return null" pattern used across
// this app's pages -- shows a spinner inside .content instead of a blank
// flash while a page's initial data fetch is in flight.
export default function SectionLoading() {
  return (
    <div className="section-loading">
      <span className="spinner spinner-lg" />
    </div>
  );
}
