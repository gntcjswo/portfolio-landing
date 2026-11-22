import { PinSection } from "@/components/ui/Section";
import { categories, projectCount, works } from "@/content/portfolio";
import { asset } from "@/lib/asset";

/**
 * C01 · #q 작업 갤러리 (히어로). The Hall GL scene draws a gallery of the 169 work screens receding into the
 * dark; scrolling flies through it into the paper-coloured opening at the far end, which is C02's
 * background (the section itself turns paper at the very end). `.c01-fallback` is a CSS-3D hall for
 * no-WebGL. Copy lifts away first; a single beat line crosses mid-flight.
 */
export function C01Question() {
  const atlas = `url(${asset("media/atlas/pf-atlas-96.jpg")})`;
  return (
    <PinSection id="q" hd={400} hm={240} className="c01" stageClassName="c01-stage">
      <div className="c01-fallback" aria-hidden="true">
        <span className="c01-wall c01-wall-l" style={{ backgroundImage: atlas }} />
        <span className="c01-wall c01-wall-r" style={{ backgroundImage: atlas }} />
        <span className="c01-door" />
      </div>

      <div className="wrap c01-inner">
        <p className="t-mono c01-eyebrow">WEB PUBLISHER · FRONTEND DEV — WOOSUNG</p>

        <div className="c01-copy">
          <h1 id="q-title" className="c01-h1">
            그려진 시안을,
            <br />
            살아 움직이는 웹으로.
          </h1>
          <p className="t-body-l c01-sub">
            웹 퍼블리셔 우성입니다.
            <br className="hidden lg:inline" /> 2015년부터 시맨틱 마크업과 인터랙션으로 기업 홈페이지와 서비스 화면을 만들고,
            <br className="hidden lg:inline" /> 지금은 SEO·AEO·GEO 개선도 맡고 있습니다.
          </p>
          <div className="c01-cta">
            <a className="btn btn-signal" href="#scroll-through" data-cursor="open">
              대표 작업 보기 <span aria-hidden="true">→</span>
            </a>
            <a className="link-u-on link-u c01-more" href="#index">
              작업 색인 {projectCount}건 보기 <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <ul className="c01-facts t-mono" aria-label="우성 요약">
          <li>
            <b>400+</b> 퍼블리싱한 작업
          </li>
          <li>
            <b>11년+</b> 웹 퍼블리싱 경력
          </li>
          <li>
            <b>{categories.length}</b> 작업 분야
          </li>
          <li>
            <b>{projectCount}</b> 이 페이지 수록
          </li>
        </ul>

        <p className="c01-beat" aria-hidden="true">
          견고한 마크업 위에,
          <br />
          섬세한 인터랙션을 쌓습니다.
        </p>

        <p className="t-meta c01-hint" aria-hidden="true">
          <span className="c01-hint-line" />
          스크롤해서 작업 사이를 지나가 보세요
        </p>
      </div>
    </PinSection>
  );
}
