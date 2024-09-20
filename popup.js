document.getElementById('startButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: injectCrawlerScript
        });
    });
});

function injectCrawlerScript() {
    function startPatternCrawler() {
        let firstElement = null;
        let secondElement = null;

        document.body.style.cursor = 'crosshair';  // 크로스헤어 커서로 변경
        console.log("Element selection mode activated. Click on two elements.");

        // 클릭 이벤트 리스너 추가
        document.addEventListener('click', function handler(event) {
            event.preventDefault();  // 기본 클릭 동작 방지

            if (!firstElement) {
                firstElement = event.target;
                console.log("First element selected:", firstElement);
            } else if (!secondElement) {
                secondElement = event.target;
                console.log("Second element selected:", secondElement);
                detectAndCrawlPattern(firstElement, secondElement);  // 패턴 탐지 및 크롤링 시작
                document.body.style.cursor = 'default';  // 커서를 원래대로 복귀
                document.removeEventListener('click', handler);  // 리스너 해제
            }
        }, { capture: true });
    }

    // 두 요소를 선택한 후, 공통 패턴을 감지하고 크롤링하는 함수
    function detectAndCrawlPattern(el1, el2) {
        const xpath1 = getXPath(el1);  // 첫 번째 요소의 XPath 계산
        const xpath2 = getXPath(el2);  // 두 번째 요소의 XPath 계산

        console.log("XPath 1:", xpath1);
        console.log("XPath 2:", xpath2);

        const { before, after, startIndex } = findXPathPattern(xpath1, xpath2);

        if (before && after && startIndex !== null) {
            crawlElementsByPattern(before, after, startIndex);
        } else {
            console.log("No valid pattern found.");
        }
    }

    // 선택한 요소의 XPath를 계산하는 함수
    function getXPath(element) {
        let xpath = '';
        let currentElement = element;
    
        // 루트 요소는 'document.documentElement' (즉, 'html')로 설정
        while (currentElement !== document.documentElement) {
            const tagName = currentElement.tagName.toLowerCase();
            
            // 'html', 'body' 태그에는 인덱스를 붙이지 않음
            if (tagName === 'html' || tagName === 'body') {
                xpath = `/${tagName}${xpath}`;
            } else {
                const index = Array.from(currentElement.parentNode.children).filter((el) => el.tagName === currentElement.tagName).indexOf(currentElement) + 1;
                xpath = `/${tagName}[${index}]${xpath}`;
            }
    
            currentElement = currentElement.parentNode;
        }
    
        // 루트 요소 'html'을 포함한 XPath 반환
        return `/html${xpath}`;
    }
    

    // 두 XPath에서 변동되는 부분 앞뒤를 찾아내는 함수
    function findXPathPattern(xpath1, xpath2) {
        const parts1 = xpath1.split('/');
        const parts2 = xpath2.split('/');
        let before = '';
        let after = '';
        let startIndex = null;

        for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
            if (parts1[i] === parts2[i]) {
                before += `${parts1[i]}/`;  // 고정된 앞 부분
            } else {
                const match1 = parts1[i].match(/div\[(\d+)\]/);
                const match2 = parts2[i].match(/div\[(\d+)\]/);
                if (match1 && match2 && match1[1] !== match2[1]) {
                    startIndex = parseInt(match1[1], 10);  // 변동이 시작되는 숫자
                    after = parts1.slice(i + 1).join('/');  // 고정된 뒷부분
                    break;
                }
            }
        }

        return { before, after, startIndex };
    }

    // 공통된 XPath의 앞뒤 부분과 변동되는 숫자를 기반으로 반복 크롤링 및 텍스트 추출
    function crawlElementsByPattern(before, after, startIndex) {
        let similarElements = [];

        // i 값을 반복하면서 변동되는 XPath를 만들고 크롤링
        for (let i = startIndex; i < startIndex + 10; i++) {
            const xpath = `${before}div[${i}]${after.startsWith('/') ? '' : '/'}${after}`;
            console.log(`Evaluating XPath: ${xpath}`);  // 디버깅을 위해 출력

            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (element) {
                similarElements.push(element);
                console.log(`Found element at ${xpath}:`, element.outerHTML);

                const textContent = element.textContent.trim();
                console.log(`Extracted text: ${textContent}`);
            } else {
                console.log(`No element found at ${xpath}. Stopping.`);
                break;  // 더 이상 요소를 찾지 못하면 중단
            }
        }

        console.log("Crawling completed successfully. Found", similarElements.length, "elements.");
    }

    // 패턴 크롤러 시작
    startPatternCrawler();
}
