import re
from playwright.sync_api import Page, expect

def test_sfd_removal_verification(page: Page):
    """
    This test verifies that all SFD (Support-Friction Differential)
    related UI components and text have been removed from the report.
    """
    # 1. Arrange: Go to the Math Brain page.
    page.goto("http://localhost:3000/math-brain")

    # Wait for the page to load by looking for the main heading.
    expect(page.get_by_role("heading", name="Math Brain")).to_be_visible()

    # 2. Act: Fill in the form for Person A to generate a report.
    # Using default values from the component's state.
    page.get_by_label("Name").fill("Dan")
    page.get_by_label("Year").fill("1973")
    page.get_by_label("Month").fill("07")
    page.get_by_label("Day").fill("24")
    page.get_by_label("Hour").fill("14")
    page.get_by_label("Minute").fill("30")
    page.get_by_label("Birth City").fill("Bryn Mawr")
    page.get_by_label("State / Province").fill("PA")
    page.get_by_label("Timezone").select_option("US/Eastern")

    # Enable transits to generate a report that would have included SFD.
    page.get_by_label("Include Transits").check()

    # Click the generate button.
    page.get_by_role("button", name="Generate Report").click()

    # 3. Assert: Wait for the report and verify SFD is gone.
    # Wait for a known part of the report to ensure it has loaded.
    expect(page.get_by_role("heading", name="Symbolic Weather Log")).to_be_visible(timeout=30000)

    # Assert that no element with the text "SFD" is present.
    # This is the core verification for the task.
    expect(page.locator("body")).not_to_contain_text(re.compile("sfd", re.IGNORECASE))

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/sfd-removed.png")