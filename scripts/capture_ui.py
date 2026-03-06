from playwright.sync_api import sync_playwright
import os

def capture():
    artifacts_dir = "/home/jeancsla/.gemini/antigravity/brain/1d243f6c-1793-467d-b3cf-a1edce62015e"
    screenshot_path = os.path.join(artifacts_dir, "landing_page.png")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000...")
            page.goto('http://localhost:3000', timeout=30000)
            print("Waiting for networkidle...")
            page.wait_for_load_state('networkidle')
            print(f"Capturing screenshot to {screenshot_path}...")
            page.screenshot(path=screenshot_path, full_page=True)
            print("Page Title:", page.title())

            # List links
            links = page.eval_on_selector_all('a', 'elements => elements.map(e => ({text: e.innerText, href: e.href}))')
            print("\nNavigation Links:")
            for link in links:
                print(f"- {link['text']} ({link['href']})")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture()
