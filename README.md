# QlikExporter

**QlikExporter**는 Qlik Sense 내에서 선택된 시각화 오브젝트를 **Excel 파일** 또는 **이미지(PNG)** 형식으로 내보내는 확장(Extension)입니다. 이미지 내보내기 시 ZIP 압축 및 암호화 기능을 지원하며, 대량 내보내기 시 안정적인 처리와 사용자 취소 기능을 포함합니다.

---

## 📦 주요 기능

### 📊 엑셀 내보내기 (Export to Excel)
- 선택된 테이블/피벗 등의 오브젝트 데이터를 Excel(.xlsx) 형식으로 내보냅니다
- 여러 개의 오브젝트 데이터를 시트로 나누어 하나의 통합 엑셀 파일로 병합
- 서버 API를 통한 **엑셀 암호화 지원**
- 시트 이름 충돌 방지를 위한 자동 정리 및 유니크 처리

### 🖼️ 이미지 내보내기 (Export to Image)
- 시각화 오브젝트를 이미지(PNG)로 추출하여 ZIP으로 묶어 다운로드
- `exportImg()` API 기반 이미지 렌더링
- **렌더링 실패 자동 재시도**, **타임아웃 설정**, **사용자 취소 이벤트** 제공
- `html2canvas`/`html-to-image` 기반 전체 시트 화면 캡처 기능(스크린샷 저장)

### 🔐 ZIP 압축 및 비밀번호 보호
- `zip.js`를 사용하여 압축 파일 생성
- **압축 파일에 비밀번호 설정 가능**
- Bandizip, 7-Zip 등 외부 압축 프로그램에서 해제 가능  
  (⚠️ Windows 기본 압축 도구에서는 비밀번호 압축 해제가 지원되지 않음)

---

## 📌 지원되는 시각화 오브젝트 (Export 대상)

확장 프로그램은 다음과 같은 Qlik Sense 시각화 오브젝트에 대해 **엑셀 및 이미지 내보내기**를 지원합니다.  
오브젝트 유형에 따라 **엑셀 내보내기 전용**, **이미지 내보내기 전용**, 또는 **둘 다 지원**됩니다.

|qType|오브젝트 명칭|Excel 내보내기|이미지 내보내기|비고|
|-----|-------------|--------------|--------------|----|
| `table`| 테이블| ✅| ✅||
| `sn-table`| 확장 테이블| ✅| ✅|확장(Extension)|
| `pivot-table`| 피벗 테이블| ✅| ✅||
| `sn-pivot-table`| 확장 피벗 테이블| ✅| ✅|확장(Extension)|
| `kpi`| KPI| ✅| ✅||
| `linechart`| 선형 차트| ✅| ✅||
| `barchart`| 막대 차트| ✅| ✅||
| `piechart`| 원형 차트| ✅| ✅||
| `combochart`| 콤보 차트| ✅| ✅||
| `bulletchart`| 불릿 차트| ✅| ✅||
| `mekkochart`| 메코 차트| ✅| ✅||
| `treemap`| 트리맵| ✅| ✅||
| `waterfallchart`| 워터폴 차트| ✅| ✅||
| `histogram`| 히스토그램| ✅| ✅||
| `map`| 지도 (맵)| ❌| ✅||
| `gauge`| 게이지 차트| ✅| ✅||
| `distributionplot`| 분포도| ✅| ✅||
| `qlik-word-cloud`| 워드 클라우드| ✅| ✅||
| `qlik-multi-kpi`| 멀티 KPI 차트| ✅| ✅|확장(Extension)|
| `qlik-radar-chart`| 레더 차트| ✅| ✅|확장(Extension)|
| `bi-irregular-2dim-heatmap`| 불규칙 2차원 히트맵| ✅| ✅|확장(Extension)|
| `boxplot`| 박스 플롯| ❌| ✅||

다음 컨테이너들의 하위 목록을 스캔 할 수 있습니다.

| qType                            | 오브젝트 명칭 (한글)              | 
|----------------------------------|-----------------------------------|
| `container`                      | 컨테이너                           |
| `sn-layout-container`            | 레이아웃 컨테이너                  |
| `sn-tabbed-container`            | 탭 컨테이너                        |

---

## ⚙️ 사용자 설정 (Extension Options)

Qlik Sense의 확장 속성 패널을 통해 다양한 옵션을 설정할 수 있습니다:

**✅ Style Settings**
| 항목 | 설명 |
|------|------|
| **Button Text** | 버튼에 표시될 텍스트를 설정합니다. 기본값: `"Export"` |
| **Button CSS** | 버튼 스타일을 직접 지정할 수 있는 CSS 문자열입니다. 기본값: 붉은색 테두리 스타일 |

**✅ Extension Settings**
| 항목 | 설명 |
|------|------|
| **Title Filter** | 오브젝트 중 **제목이 없는 시각화 객체는 필터링**하여 제외할지 여부를 설정합니다. 기본값: `true` |
| **ZipExportMode** | 엑셀 시트 병합 및 엑셀파일 암호화 대신 zip 압축 및 압축파일 암호화 모드를 활성화합니다. 기본값: `true` |
| **forceEncrypt** | 사용자에게 암호 입력을 강제하여 항상 암호화된 파일만 다운로드되도록 설정합니다. 기본값: `true` |
| **enableCapture** | 전체화면 캡쳐기능을 활성화합니다. (DOM 기반 이미지 캡쳐 품질 이슈로 사용자 선택화) 기본값: `false` |

**✅ Develop Settings**
| 항목 | 설명 |
|------|------|
| **Encrypt Server URL (Endpoint)** | 엑셀 암호화를 처리하는 외부 서버 API 주소입니다. |
| **Image Render Timeout (ms)** | `exportImg()`로 이미지를 렌더링할 때 허용되는 최대 대기 시간(ms). 기본값: `30000` (30초) |
| **Develop Mode** | 개발용 서버 경로를 사용할지 여부를 설정합니다. `true`일 경우 테스트용 API 경로로 요청이 전송됩니다 |
| **Debug Console** | Debug용 Console.log를 활성화 합니다. 기본값 : `false` |
| **CaptureLibrary** | 전체화면 캡쳐기능에 사용할 library를 선택합니다. (false : html2canvas, true:html-to-image) 기본값 : `false (html2canvas)` |
---

## 🚧 주의사항

- `exportImg()`는 병렬 실행 시 Qlik 내부 처리 한계로 일부 실패할 수 있으므로, **재시도 및 실패 처리 로직 포함**
- **압축 비밀번호 보호**는 일부 압축 해제 프로그램에서만 정상 작동합니다
- Excel 데이터가 너무 클 경우 Sheet 병합 처리 또는 암호화 API 호출 시 **브라우저 메모리** 또는 **서버 한계**에 도달할 수 있습니다


---


## 🛠 기술 스택

- Qlik Sense Extension (RequireJS 기반)
- JavaScript / jQuery
- [SheetJS](https://sheetjs.com/) (Excel 병합 및 파싱)
- [zip.js](https://gildas-lormeau.github.io/zip.js/) (ZIP 압축 및 비밀번호 보호)
- html2canvas (스크린샷 캡처)


---
