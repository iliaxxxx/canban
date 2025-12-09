#!/bin/bash

echo "🔄 Starting migration from Gemini to Claude..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Files to update
FILES=(
    "App.tsx"
    "components/AIGenerator.tsx"
    "components/CompetitorView.tsx"
    "components/CarouselMaker.tsx"
)

echo "📝 Updating import statements..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Replace geminiService with claudeService
        sed -i.bak "s/geminiService/claudeService/g" "$file"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Updated: $file"
            rm "${file}.bak" # Remove backup file
        else
            echo -e "${YELLOW}⚠${NC} Warning: Could not update $file"
        fi
    else
        echo -e "${YELLOW}⚠${NC} File not found: $file"
    fi
done

echo ""
echo "🗑️  Removing old geminiService.ts..."
if [ -f "services/geminiService.ts" ]; then
    rm "services/geminiService.ts"
    echo -e "${GREEN}✓${NC} Removed: services/geminiService.ts"
else
    echo -e "${YELLOW}⚠${NC} File not found: services/geminiService.ts"
fi

echo ""
echo "📦 Copying new claudeService.ts..."
if [ -f "claudeService.ts" ]; then
    cp "claudeService.ts" "services/claudeService.ts"
    echo -e "${GREEN}✓${NC} Copied: claudeService.ts → services/claudeService.ts"
else
    echo -e "${YELLOW}⚠${NC} File not found: claudeService.ts"
fi

echo ""
echo "🔑 Updating .env.local..."
if [ -f ".env.local" ]; then
    if grep -q "GEMINI_API_KEY" ".env.local"; then
        sed -i.bak 's/GEMINI_API_KEY/ANTHROPIC_API_KEY/g' ".env.local"
        rm ".env.local.bak"
        echo -e "${GREEN}✓${NC} Updated: .env.local"
        echo -e "${YELLOW}⚠${NC} Don't forget to add your Anthropic API key!"
    else
        echo -e "${YELLOW}⚠${NC} No GEMINI_API_KEY found in .env.local"
    fi
else
    echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here" > .env.local
    echo -e "${GREEN}✓${NC} Created: .env.local"
fi

echo ""
echo "📦 Updating package.json..."
if [ -f "package.json" ]; then
    # Remove @google/genai and add @anthropic-ai/sdk
    npm uninstall @google/genai --save
    npm install @anthropic-ai/sdk --save
    echo -e "${GREEN}✓${NC} Updated dependencies"
else
    echo -e "${YELLOW}⚠${NC} package.json not found"
fi

echo ""
echo "✨ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Add your Anthropic API key to .env.local"
echo "2. Run: npm install"
echo "3. Run: npm run dev"
echo ""
echo "📖 See MIGRATION_GUIDE.md for detailed information"
