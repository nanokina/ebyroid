#ifndef EBYUTIL_H
#define EBYUTIL_H

#ifdef _DEBUG
# include "assert.h"
# define e_assert(expr) assert(expr)
# define en_assert(expr) assert(expr)
#else
# define e_assert(expr) do { if(!(expr)) { napi_throw_error(env, "EBY001", "assertion e_assert(" #expr ") failed."); return; }; } while(0)
# define en_assert(expr) do { if(!(expr)) { napi_throw_error(env, "EBY001", "assertion en_assert(" #expr ") failed."); return NULL; }; } while(0)
#endif

#ifdef _DEBUG
# define Dprintf(a, b) do { printf( "\x1b[1;36m[C++ DEBUG]\x1b[0m " a "\n", b ); } while(0)
#else
# define Dprintf(a, b) (void)(0)
#endif

#define _____coffee(milk) #milk
#define _____applepie(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t) _____coffee(j##a##l##f##k##n##i##g##h##t##s##q##r##c##o##d##e##b##m##p)
#define EBY_SEED _____applepie(R, 2, p, b, H, J, I, W, A, O, C, X, a, 6, D, l, K, D, U, A)

#endif /* EBYUTIL_H */
