export default function Footer() {
  return (
    <footer className="border-t py-12" style={{ borderColor: '#334155', background: 'rgba(30,41,59,0.3)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#8B5CF6' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="font-bold text-[#F8FAFC]">AI音创工坊</span>
            </div>
            <p className="text-[#94A3B8] text-sm max-w-xs">
              基于先进生成式 AI 技术的音乐创作平台，让每个人都能成为作曲家。
            </p>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-[#F8FAFC]">产品</h5>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors">功能特性</a></li>
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors" data-omniflow-feature-status="unbuilt">价格方案</a></li>
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors" data-omniflow-feature-status="unbuilt">API 接口</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4 text-[#F8FAFC]">支持</h5>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors" data-omniflow-feature-status="unbuilt">帮助中心</a></li>
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors" data-omniflow-feature-status="unbuilt">社区论坛</a></li>
              <li><a href="#" className="hover:text-[#8B5CF6] transition-colors" data-omniflow-feature-status="unbuilt">联系我们</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#94A3B8]" style={{ borderTop: '1px solid #334155' }}>
          <p>© 2026 AI音创工坊. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#F8FAFC] transition-colors" data-omniflow-feature-status="unbuilt">隐私政策</a>
            <a href="#" className="hover:text-[#F8FAFC] transition-colors" data-omniflow-feature-status="unbuilt">服务条款</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
