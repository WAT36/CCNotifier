interface GraphCardProps {
  title: string;
  children?: React.ReactNode;
}

export default function GraphCard({ title, children }: GraphCardProps) {
  return (
    <>
      <div className="graph-card">
        <h3 className="graph-title">{title}</h3>
        <div className="graph-content">
          {children || "グラフエリア（データ読み込み中...）"}
        </div>
      </div>
      
      <style jsx>{`
        .graph-card {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1rem;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .graph-title {
          margin: 0 0 1rem 0;
          color: #495057;
          font-size: 1.1rem;
        }
        
        .graph-content {
          width: 100%;
          height: 200px;
          background-color: #e9ecef;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .graph-card {
            min-height: 250px;
            padding: 0.75rem;
          }
          
          .graph-title {
            font-size: 1rem;
            margin-bottom: 0.75rem;
          }
          
          .graph-content {
            height: 180px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}
