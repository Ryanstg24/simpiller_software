# Auth System Migration Plan

## 🚨 Current Problems
- Complex role fetching with timeouts and fallbacks
- Fragile state management causing UI to break
- Fallback "provider" roles confusing users
- Session timeout disabled due to instability
- Multiple auth states that can fail independently
- Poor error handling causing cascading failures

## ✅ New Auth System (V2)

### Key Improvements:
1. **Simplified Architecture**: Single source of truth for user permissions
2. **Robust Error Handling**: No fallback roles, proper error boundaries
3. **Persistent State**: Roles don't disappear on network issues
4. **Clean Session Management**: Proper token refresh and logout
5. **Optimistic UI**: Show data immediately, update in background
6. **Better Caching**: Data persists across auth changes

### Files Created:
- `src/contexts/auth-context-v2.tsx` - New robust auth context
- `src/hooks/use-patients-v2.ts` - Simplified data fetching
- `src/hooks/use-session-timeout-v2.ts` - Working session timeout

## 🔄 Migration Steps

### Phase 1: Test New Auth System
1. Create a test page that uses the new auth system
2. Verify role fetching works reliably
3. Test session timeout functionality
4. Ensure data doesn't disappear

### Phase 2: Gradual Migration
1. Replace auth context in one page at a time
2. Update data fetching hooks to use V2
3. Test each page thoroughly before moving to next
4. Keep old system as fallback during transition

### Phase 3: Complete Migration
1. Replace all auth context usage
2. Remove old auth files
3. Update all data fetching hooks
4. Remove fallback roles and complex error handling

## 🎯 Expected Results
- **No more disappearing data** after 10 seconds
- **No more fallback roles** confusing users
- **Reliable session management** that actually works
- **Professional user experience** without refresh requirements
- **Stable platform** ready for production release

## 🚀 Implementation Priority
1. **HIGH**: Test new auth system with real data
2. **HIGH**: Migrate patients page first (most critical)
3. **MEDIUM**: Migrate other data-heavy pages
4. **LOW**: Clean up old auth files

## 📋 Testing Checklist
- [ ] User can log in and see correct roles
- [ ] Data loads and stays visible
- [ ] Session timeout works properly
- [ ] No fallback roles appear
- [ ] Page refreshes don't break auth
- [ ] Network issues don't cause UI to disappear
- [ ] All user types (admin, org admin, provider, billing) work correctly
