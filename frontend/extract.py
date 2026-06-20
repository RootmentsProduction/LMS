import re

with open('/Users/abijithgkaimal/Documents/lms-testenv/frontend/src/pages/Walkin/WalkinList.jsx', 'r') as f:
    content = f.read()

start_marker = "{/* IF STATUS IS 'Loss' -> SEQUENTIAL FLOW */}"
end_marker = "</div>\n\n                                    {/* Remarks Section */}"

start_idx = content.find(start_marker)
# Find the exact end marker
end_idx = content.find("{/* Remarks Section */}")

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    print(start_idx, end_idx)
    exit(1)

# we need to go back a bit to the </div>
end_idx = content.rfind("</div>", start_idx, end_idx)

extracted_jsx = content[start_idx:end_idx]

# Replace the original block with a function call
new_content = content[:start_idx] + "{renderLossAndRevisitFields()}\n                                    " + content[end_idx:]

component_start = new_content.find("const WalkinList = () => {")
insert_point = new_content.find("const isRestrictedEdit =", component_start)

function_definition = f"""
    const renderLossAndRevisitFields = () => (
        <>
            {extracted_jsx}
        </>
    );

"""

new_content = new_content[:insert_point] + function_definition + new_content[insert_point:]

with open('/Users/abijithgkaimal/Documents/lms-testenv/frontend/src/pages/Walkin/WalkinList.jsx', 'w') as f:
    f.write(new_content)

print("Extracted successfully!")
