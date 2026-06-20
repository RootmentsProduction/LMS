import re

with open('/Users/abijithgkaimal/Documents/lms-testenv/frontend/src/pages/Walkin/WalkinList.jsx', 'r') as f:
    content = f.read()

# We need to find the start of: {/* IF STATUS IS 'Loss' -> SEQUENTIAL FLOW */}
start_marker = "{/* IF STATUS IS 'Loss' -> SEQUENTIAL FLOW */}"
end_marker = "{/* Remarks Section */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

extracted_jsx = content[start_idx:end_idx]

# Replace the original block with a function call
new_content = content[:start_idx] + "{renderLossAndRevisitFields()}\n\n                                    " + content[end_idx:]

# Define the function near the top of the component
component_start = new_content.find("const WalkinList = () => {")
# Find a good place to insert the function (e.g., after the state declarations)
insert_point = new_content.find("const isRestrictedEdit =", component_start)

function_definition = f"""
    const renderLossAndRevisitFields = () => (
        <>
            {extracted_jsx}
        </>
    );

"""

new_content = new_content[:insert_point] + function_definition + new_content[insert_point:]

# We also need to add `showStatusModal` state
state_marker = "const [showAddView, setShowAddView] = useState(false);"
new_content = new_content.replace(state_marker, state_marker + "\n    const [showStatusModal, setShowStatusModal] = useState(false);")

with open('/Users/abijithgkaimal/Documents/lms-testenv/frontend/src/pages/Walkin/WalkinList.jsx', 'w') as f:
    f.write(new_content)

print("Successfully extracted JSX into renderLossAndRevisitFields")
