import React from 'react';

export const PageHeader = ({ title, subtitle, breadcrumbs = [], action }) => {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav className="flex text-xs text-stone-500 mb-2 space-x-2">
          {breadcrumbs.map((b, idx) => (
            <span key={idx} className="flex items-center space-x-2">
              {idx > 0 && <span className="text-stone-300">/</span>}
              <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-stone-800' : 'hover:text-stone-700'}>
                {b}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-stone-600 mt-1 font-normal">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
