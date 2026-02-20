type LoadingSkeletonRowsProps = {
  rows?: number;
};

export function LoadingSkeletonRows({ rows = 7 }: LoadingSkeletonRowsProps): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr className="animate-pulse" key={`skeleton-row-${index}`}>
          <td className="border-b border-slate-100 px-4 py-3">
            <div className="h-3 w-44 rounded bg-slate-100" />
          </td>
          <td className="border-b border-slate-100 px-4 py-3">
            <div className="h-6 w-28 rounded-full bg-slate-100" />
          </td>
          <td className="border-b border-slate-100 px-4 py-3">
            <div className="h-3 w-36 rounded bg-slate-100" />
          </td>
          <td className="border-b border-slate-100 px-4 py-3">
            <div className="ml-auto h-8 w-16 rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
