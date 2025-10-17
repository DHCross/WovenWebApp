from playwright.sync_api import Page, expect

def test_math_brain_page(page: Page):
    """
    This test verifies that the Math Brain page loads correctly.
    """
    print("Navigating to Math Brain page...")
    # 1. Arrange: Go to the Math Brain page.
    page.goto("http://localhost:3000/math-brain")
    print("Navigation complete.")

    # 2. Assert: Confirm the page title is correct.
    print("Checking page title...")
    expect(page).to_have_title("Math Brain")
    print("Page title is correct.")

    # 3. Screenshot: Capture the final result for visual verification.
    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot complete.")